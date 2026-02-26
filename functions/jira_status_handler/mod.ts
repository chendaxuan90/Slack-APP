import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { JiraStatusHandler } from "./definition.ts";

const ALLOWED_USER_ID = "U09U1S2M80Y";

const STATUS_TODO = "To Do";
const STATUS_PENDING = "Pending Approval";
const STATUS_APPROVED = "Approved";

const ACTION_TODO_TO_PENDING = "jira_todo_to_pending";
const ACTION_PENDING_TO_APPROVED = "jira_pending_to_approved";

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

function normalizeBaseUrl(url: string) {
  return (url ?? "").trim().replace(/\/+$/, "");
}

async function jiraFetch(env: Record<string, string>, path: string, init?: RequestInit) {
  const baseUrl = normalizeBaseUrl(env.JIRA_BASE_URL ?? "");
  const email = (env.JIRA_EMAIL ?? "").trim();
  const token = (env.JIRA_API_TOKEN ?? "").trim();

  if (!baseUrl || !email || !token) {
    throw new Error("Missing env: JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN");
  }

  const resp = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Authorization": "Basic " + b64(`${email}:${token}`),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data, baseUrl };
}

function buildBlocks(issueKey: string, issueUrl: string, status: string) {
  const blocks: any[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Issue:* <${issueUrl}|${issueKey}>\n*Current Status:* *${status}*` },
    },
  ];

  // 根据状态决定按钮（按钮只在 App 消息里出现，workflow 不放按钮）
  if (status === STATUS_TODO) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: ACTION_TODO_TO_PENDING,
          text: { type: "plain_text", text: "To Do ➡ Pending Approval" },
          style: "primary",
          value: issueKey,
        },
      ],
    });
  } else if (status === STATUS_PENDING) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: ACTION_PENDING_TO_APPROVED,
          text: { type: "plain_text", text: "Pending Approval ➡ Approved" },
          style: "primary",
          value: issueKey,
        },
      ],
    });
  }

  return blocks;
}

async function getCurrentStatus(env: Record<string, string>, issueKey: string): Promise<string> {
  // GET issue status
  const r = await jiraFetch(env, `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=status`, {
    method: "GET",
  });
  if (!r.ok) throw new Error(`GET issue failed ${r.status}: ${JSON.stringify(r.data)}`);
  return r.data?.fields?.status?.name ?? "Unknown";
}

async function transitionTo(env: Record<string, string>, issueKey: string, targetStatusName: string) {
  // GET transitions
  const getRes = await jiraFetch(env, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
    method: "GET",
  });
  if (!getRes.ok) throw new Error(`GET transitions failed ${getRes.status}: ${JSON.stringify(getRes.data)}`);

  const transitions: any[] = getRes.data?.transitions ?? [];
  const match = transitions.find((t) => t?.name === targetStatusName || t?.to?.name === targetStatusName);
  if (!match?.id) {
    const names = transitions.map((t) => t?.name ?? t?.to?.name).filter(Boolean).slice(0, 20).join(", ");
    throw new Error(`No transition to "${targetStatusName}". Available: ${names || "(none)"}`);
  }

  // POST transition
  const postRes = await jiraFetch(env, `/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: match.id } }),
  });
  if (!postRes.ok) throw new Error(`POST transition failed ${postRes.status}: ${JSON.stringify(postRes.data)}`);
}

export default SlackFunction(JiraStatusHandler, async ({ inputs, client, env }) => {
  // 1) 读取 Jira 当前状态（不自己存变量）
  let status: string;
  try {
    status = await getCurrentStatus(env, inputs.issueKey);
  } catch (e) {
    return { error: String(e) };
  }

  // 2) 发一条“当前状态 +（可能的）按钮”的消息
  const blocks = buildBlocks(inputs.issueKey, inputs.issueUrl, status);

  const r = await client.chat.postMessage({
    channel: inputs.channel_id,
    blocks,
    text: `Issue ${inputs.issueKey} status: ${status}`,
  });

  if (!r.ok) return { error: `chat.postMessage failed: ${r.error}` };

  // 让按钮可点击
  return { completed: false };
})
  .addBlockActionsHandler([ACTION_TODO_TO_PENDING, ACTION_PENDING_TO_APPROVED], async ({ action, body, client, env }) => {
    const clicker = body.user.id;
    const issueKey = (action.value ?? "").trim();
    const channel = body.container.channel_id;
    const ts = body.container.message_ts;

    // 权限限制
    if (clicker !== ALLOWED_USER_ID) {
      await client.chat.postEphemeral({
        channel,
        user: clicker,
        text: "You are not allowed to click this button.",
      });
      return;
    }

    if (!issueKey) {
      await client.chat.postEphemeral({
        channel,
        user: clicker,
        text: "Missing issueKey in button payload.",
      });
      return;
    }

    // 决定目标状态
    const target = action.action_id === ACTION_TODO_TO_PENDING ? STATUS_PENDING : STATUS_APPROVED;

    // 执行 transition
    try {
      await transitionTo(env, issueKey, target);
    } catch (e) {
      await client.chat.postEphemeral({
        channel,
        user: clicker,
        text: `Transition failed: ${String(e)}`,
      });
      return;
    }

    // 重新读取当前状态并更新消息（按钮随状态自动变化）
    let newStatus = "Unknown";
    try {
      newStatus = await getCurrentStatus(env, issueKey);
    } catch {
      newStatus = target; // 兜底
    }

    const baseUrl = normalizeBaseUrl(env.JIRA_BASE_URL ?? "");
    const issueUrl = `${baseUrl}/browse/${issueKey}`;
    const newBlocks = buildBlocks(issueKey, issueUrl, newStatus);

    const u = await client.chat.update({
      channel,
      ts,
      blocks: newBlocks,
      text: `Issue ${issueKey} status: ${newStatus}`,
    });

    if (!u.ok) {
      await client.chat.postEphemeral({
        channel,
        user: clicker,
        text: `Transition succeeded, but message update failed: ${u.error}`,
      });
      // 仍然 complete
    }

    await client.functions.completeSuccess({
      function_execution_id: body.function_data.execution_id,
      outputs: {
        status: newStatus,
        updatedBy: clicker,
      },
    });
  });