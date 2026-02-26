import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { StepTodoToPending } from "./definition.ts";
import { DEFAULT_ALLOWED_USER_ID, runTransitionStep } from "../_shared/step_common.ts";

const ACTION_ID = "jira_step_todo_to_pending";

export default SlackFunction(StepTodoToPending, async ({ inputs, client }) => {
  const blocks = [
    { type: "section", text: { type: "mrkdwn", text: `*Jira:* <${inputs.issueUrl}|${inputs.issueKey}>\nNext: *To Do → Pending Approval*` } },
    { type: "actions", elements: [{ type: "button", action_id: ACTION_ID, text: { type: "plain_text", text: "To Do ➡ Pending Approval" }, style: "primary", value: inputs.issueKey }] },
  ];

  const r = await client.chat.postMessage({ channel: inputs.channel_id, blocks, text: `To Do → Pending: ${inputs.issueKey}` });
  if (!r.ok) return { error: `chat.postMessage failed: ${r.error}` };
  return { completed: false };
}).addBlockActionsHandler([ACTION_ID], async ({ action, body, client, env }) => {
  const clicker = body.user.id;
  const issueKey = (action.value ?? "").trim();

  if (clicker !== DEFAULT_ALLOWED_USER_ID) {
    await client.chat.postEphemeral({ channel: body.container.channel_id, user: clicker, text: "Not allowed." });
    return;
  }

  const result = await runTransitionStep({
    env,
    client,
    body,
    clicker,
    issueKey,
    transitionEnvKey: "JIRA_TRANSITION_TODO_TO_PENDING",
  });
  if (!result.ok) return;

  await client.chat.update({
    channel: body.container.channel_id,
    ts: body.container.message_ts,
    text: `Updated: ${issueKey}`,
    blocks: [{ type: "section", text: { type: "mrkdwn", text: `✅ Done by <@${clicker}>\nTransition: *${result.transitionName}*\nStatus: *${result.before}* → *${result.after}*\n<${result.issueUrl}|${issueKey}>` } }],
  });

  await client.functions.completeSuccess({
    function_execution_id: body.function_data.execution_id,
    outputs: { issueKey, status: result.after },
  });
});