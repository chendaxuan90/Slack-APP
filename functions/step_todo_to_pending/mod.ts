import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { StepTodoToPending } from "./definition.ts";
import { formatJstNow, runTransitionDirect } from "../_shared/step_common.ts";

export default SlackFunction(StepTodoToPending, async ({ inputs, client, env }) => {
  const executedAt = formatJstNow();

  const result = await runTransitionDirect({
    env,
    issueKey: inputs.issueKey,
    issueUrl: inputs.issueUrl,
    transitionEnvKey: "JIRA_TRANSITION_TODO_TO_PENDING",
  });

  if (!result.ok) {
    const shownKey = result.issueKey ?? inputs.issueKey;
    await client.chat.postMessage({
      channel: inputs.channel_id,
      text: `⚠️ Failed: ${shownKey}`,
      blocks: [{
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `⚠️ *Failed*\n` +
            `*Issue:* ${inputs.issueUrl ? `<${inputs.issueUrl}|${shownKey}>` : shownKey}\n` +
            `*When:* ${executedAt}\n` +
            `*Status Before:* *${result.statusBefore ?? "Unknown"}*\n` +
            `*Error:* \`${result.error}\``,
        },
      }],
    });
    return { error: result.error };
  }

  await client.chat.postMessage({
    channel: inputs.channel_id,
    text: `✅ Done: ${result.issueKey}`,
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `✅ *Done*\n` +
          `*Issue:* <${result.issueUrl}|${result.issueKey}>\n` +
          `*Status Before:* *${result.statusBefore}*\n` +
          `*Status Now:* *${result.statusNow}*\n` +
          `*When:* ${executedAt}`,
      },
    }],
  });

  return { outputs: { issueKey: result.issueKey, status: result.statusNow } };
});