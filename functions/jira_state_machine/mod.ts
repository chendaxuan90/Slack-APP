import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { JiraStateMachine } from "./definition.ts";

import { jiraBaseUrl, getIssueStatusName, transitionByName } from "../_shared/jira.ts";
import { readStatusConfig } from "../_shared/status_config.ts";
import { DEFAULT_ALLOWED_USER_ID } from "../_shared/step_common.ts";

const ACTION_REFRESH = "jira_machine_refresh";
const ACTION_EXECUTE = "jira_machine_execute";

type RefreshPayload = { issueKey: string };
type ExecutePayload = { issueKey: string };

function safeJsonParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

function normalizeIssueKey(maybeKeyOrUrl: string) {
  const s = (maybeKeyOrUrl ?? "").trim();
  const m = s.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/i);
  if (m?.[1]) return m[1].toUpperCase();
  const m2 = s.match(/([A-Z][A-Z0-9_]+-\d+)/i);
  if (m2?.[1]) return m2[1].toUpperCase();
  return s.toUpperCase();
}

function decideNextByStatus(env: Record<string, string>, currentStatus: string) {
  const S = readStatusConfig(env);

  if (currentStatus === S.TODO) {
    const t = (env.JIRA_TRANSITION_TODO_TO_PENDING ?? "Task Create").trim();
    return { label: "Move to Pending Approval", transitionName: t };
  }
  if (currentStatus === S.PENDING) {
    const t = (env.JIRA_TRANSITION_PENDING_TO_APPROVED ?? "Approve").trim();
    return { label: "Approve", transitionName: t };
  }
  if (currentStatus === S.APPROVED) {
    const t = (env.JIRA_TRANSITION_APPROVED_TO_IN_PROCESS ?? "Task Start").trim();
    return { label: "Start (In Process)", transitionName: t };
  }
  if (currentStatus === S.IN_PROCESS) {
    const t = (env.JIRA_TRANSITION_IN_PROCESS_TO_IN_REVIEW ?? "Task complete").trim();
    return { label: "Send to Review", transitionName: t };
  }
  if (currentStatus === S.IN_REVIEW) {
    const t = (env.JIRA_TRANSITION_IN_REVIEW_TO_DONE ?? "Task close").trim();
    return { label: "Close (Done)", transitionName: t };
  }

  return null; // DONE/Unknown
}

function section(issueKey: string, issueUrl: string, status: string, actor?: string, note?: string) {
  const a = actor ? `<@${actor}>` : "-";
  const n = note ? `\n${note}` : "";
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Jira:* <${issueUrl}|${issueKey}>\n*Current Status:* *${status}*\n*Last Action By:* ${a}${n}`,
    },
  };
}

function blocksRefreshOnly(issueKey: string, issueUrl: string, status: string, actor?: string, note?: string) {
  return [
    section(issueKey, issueUrl, status, actor, note),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: ACTION_REFRESH,
          text: { type: "plain_text", text: "Refresh Status" },
          value: JSON.stringify({ issueKey } satisfies RefreshPayload),
        },
      ],
    },
  ];
}

// Refresh 后：只显示 Execute（不再显示 Refresh）
function blocksExecuteOnly(issueKey: string, issueUrl: string, status: string, actor: string, execText: string, note?: string) {
  return [
    section(issueKey, issueUrl, status, actor, note),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: ACTION_EXECUTE,
          text: { type: "plain_text", text: `Execute: ${execText}` },
          style: "primary",
          value: JSON.stringify({ issueKey } satisfies ExecutePayload),
        },
      ],
    },
  ];
}

async function completeSuccess(client: any, executionId: string, outputs: any) {
  await client.functions.completeSuccess({
    function_execution_id: executionId,
    outputs,
  });
}

export default SlackFunction(JiraStateMachine, async ({ inputs, client, env }) => {
  const issueKey = normalizeIssueKey(inputs.issueKey);
  const issueUrl = `${jiraBaseUrl(env)}/browse/${issueKey}`;

  const status = await getIssueStatusName(env, issueKey);

  const r = await client.chat.postMessage({
    channel: inputs.channel_id,
    text: `Jira: ${issueKey}`,
    blocks: blocksRefreshOnly(
      issueKey,
      issueUrl,
      status,
      undefined,
      "\nClick *Refresh Status* to load the next executable action.",
    ),
  });

  if (!r.ok) return { error: `chat.postMessage failed: ${r.error}` };
  return { completed: false };
}).addBlockActionsHandler([ACTION_REFRESH, ACTION_EXECUTE], async ({ action, body, client, env, inputs }) => {
  const executionId = body.function_data.execution_id;
  const clicker = body.user.id;
  const channel = body.container.channel_id;
  const ts = body.container.message_ts;

  // issueKey from button payload (preferred), fallback to inputs
  let issueKey = normalizeIssueKey(inputs.issueKey);
  if (action.action_id === ACTION_REFRESH) {
    const p = safeJsonParse<RefreshPayload>(action.value ?? "");
    issueKey = normalizeIssueKey(p?.issueKey ?? issueKey);
  } else {
    const p = safeJsonParse<ExecutePayload>(action.value ?? "");
    issueKey = normalizeIssueKey(p?.issueKey ?? issueKey);
  }

  const issueUrl = `${jiraBaseUrl(env)}/browse/${issueKey}`;

  // Always read real current status first
  const current = await getIssueStatusName(env, issueKey);
  const next = decideNextByStatus(env, current);

  // Refresh: show Execute only (or show "No next step" and keep Refresh)
  if (action.action_id === ACTION_REFRESH) {
    if (!next) {
      await client.chat.update({
        channel,
        ts,
        text: `Refreshed: ${issueKey}`,
        blocks: blocksRefreshOnly(issueKey, issueUrl, current, clicker, "\nNo next step for this status."),
      });
      // ❗不 completeSuccess：允许继续 refresh
      return;
    }

    await client.chat.update({
      channel,
      ts,
      text: `Refreshed: ${issueKey}`,
      blocks: blocksExecuteOnly(
        issueKey,
        issueUrl,
        current,
        clicker,
        next.label,
        `\n✅ Ready. Next transition: *${next.transitionName}*`,
      ),
    });

    // ❗不 completeSuccess：Execute 还要点
    return;
  }

  // Execute: re-check status again (guard against Jira manual changes)
  const before = await getIssueStatusName(env, issueKey);
  const step = decideNextByStatus(env, before);

  if (!step) {
    await client.chat.update({
      channel,
      ts,
      text: `No next step: ${issueKey}`,
      blocks: blocksRefreshOnly(issueKey, issueUrl, before, clicker, "\nNo next step available. Please refresh."),
    });

    await completeSuccess(client, executionId, {
      interactivity: inputs.interactivity,
      issueKey,
      status: before,
      updatedBy: clicker,
    });
    return;
  }

  // Only restrict Pending Approval -> Approved
  const S = readStatusConfig(env);
  const approveName = (env.JIRA_TRANSITION_PENDING_TO_APPROVED ?? "Approve").trim();
  const isApprovalStep = before === S.PENDING && step.transitionName === approveName;

  if (isApprovalStep && clicker !== DEFAULT_ALLOWED_USER_ID) {
    await client.chat.postEphemeral({
      channel,
      user: clicker,
      text: `Only <@${DEFAULT_ALLOWED_USER_ID}> can approve.`,
    });

    await client.chat.update({
      channel,
      ts,
      text: `Restricted: ${issueKey}`,
      blocks: blocksExecuteOnly(
        issueKey,
        issueUrl,
        before,
        clicker,
        step.label,
        `\n⚠️ Restricted: only <@${DEFAULT_ALLOWED_USER_ID}> can approve.`,
      ),
    });

    await completeSuccess(client, executionId, {
      interactivity: inputs.interactivity,
      issueKey,
      status: before,
      updatedBy: clicker,
    });
    return;
  }

  // Execute transition
  let appliedName = step.transitionName;
  try {
    await transitionByName(env, issueKey, step.transitionName);
  } catch (e) {
    const afterFail = await getIssueStatusName(env, issueKey);

    await client.chat.update({
      channel,
      ts,
      text: `Transition failed: ${issueKey}`,
      blocks: blocksRefreshOnly(
        issueKey,
        issueUrl,
        afterFail,
        clicker,
        `\n⚠️ Failed: *${step.transitionName}*\n\`${String(e)}\``,
      ),
    });

    await completeSuccess(client, executionId, {
      interactivity: inputs.interactivity,
      issueKey,
      status: afterFail,
      updatedBy: clicker,
    });
    return;
  }

  const after = await getIssueStatusName(env, issueKey);

  // Notify in same channel
  await client.chat.postMessage({
    channel,
    text:
      `✅ *Jira updated* <${issueUrl}|${issueKey}>\n` +
      `• ${before} → ${after} (via *${appliedName}*)\n` +
      `• By: <@${clicker}>`,
  });

  // Back to refresh-only UI for next cycle
  await client.chat.update({
    channel,
    ts,
    text: `Updated: ${issueKey}`,
    blocks: blocksRefreshOnly(
      issueKey,
      issueUrl,
      after,
      clicker,
      `\n✅ Applied: *${appliedName}*. Click *Refresh Status* to load the next action.`,
    ),
  });

  await completeSuccess(client, executionId, {
    interactivity: inputs.interactivity,
    issueKey,
    status: after,
    updatedBy: clicker,
  });
});