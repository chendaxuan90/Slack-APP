import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { CreateJiraTask } from "./definition.ts";

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

function normalizeBaseUrl(url: string) {
  return (url ?? "").trim().replace(/\/+$/, "");
}

// 简单 ADF：一段纯文本
function toADF(text: string) {
  const t = (text ?? "").trim();
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: t }],
      },
    ],
  };
}

export default SlackFunction(CreateJiraTask, async ({ inputs, env }) => {
  const baseUrl = normalizeBaseUrl(env.JIRA_BASE_URL);
  const email = (env.JIRA_EMAIL ?? "").trim();
  const apiToken = (env.JIRA_API_TOKEN ?? "").trim();

  if (!baseUrl || !email || !apiToken) {
    return { error: "Missing env: JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN" };
  }

  const taskName = (inputs.taskName ?? "").trim();
  const summary = (inputs.summary ?? "").trim();
  const userId = (inputs.requester ?? "").trim();
  const userDesc = `Created via Slack by <@${userId}>`;

  if (!taskName || !summary || !userId) {
    return { error: "requester, taskName and summary are required." };
  }

  // 固定项目
  const projectKey = "KAN";

  // 你要的：TaskName + Summary 都必填，放进 Jira summary
  const jiraSummary = `[${taskName}] ${summary}`;

  const extra = (inputs.description ?? "").trim();
  const fullDesc = extra ? `${userDesc}\n\n${extra}` : userDesc;

  const auth = "Basic " + b64(`${email}:${apiToken}`);

  const body = {
    fields: {
      project: { key: projectKey },
      summary: jiraSummary,
      description: toADF(fullDesc),
      issuetype: { name: "Task" }, // 如果你们不是 Task（比如 タスク），改这里
    },
  };

  const resp = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      "Authorization": auth,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    return { error: `Jira API error ${resp.status}: ${JSON.stringify(data)}` };
  }

  const issueKey = data.key as string;
  const issueUrl = `${baseUrl}/browse/${issueKey}`;

  return { outputs: { issueKey, issueUrl } };
});
