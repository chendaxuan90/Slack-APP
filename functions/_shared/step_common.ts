import { getIssueStatusName, transitionByName, jiraBaseUrl } from "./jira.ts";

export const DEFAULT_ALLOWED_USER_ID = "U09U1S2M80Y";

export async function runTransitionStep(args: {
  env: Record<string, string>;
  client: any;
  body: any;
  clicker: string;
  issueKey: string;
  transitionEnvKey: string;
}) {
  const { env, client, body, clicker, issueKey, transitionEnvKey } = args;

  const transitionName = (env[transitionEnvKey] ?? "").trim();
  if (!transitionName) {
    await client.chat.postEphemeral({
      channel: body.container.channel_id,
      user: clicker,
      text: `Missing env: ${transitionEnvKey}`,
    });
    return { ok: false as const };
  }

  let before = "Unknown";
  try {
    before = await getIssueStatusName(env, issueKey);
  } catch {}

  try {
    await transitionByName(env, issueKey, transitionName);
  } catch (e) {
    await client.chat.postEphemeral({
      channel: body.container.channel_id,
      user: clicker,
      text: `Transition failed (${transitionName}): ${String(e)}`,
    });
    return { ok: false as const };
  }

  let after = "Unknown";
  try {
    after = await getIssueStatusName(env, issueKey);
  } catch {}

  const baseUrl = jiraBaseUrl(env);
  const issueUrl = `${baseUrl}/browse/${issueKey}`;

  return { ok: true as const, before, after, issueUrl, transitionName };
}