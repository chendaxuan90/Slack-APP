import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const StepTodoToPending = DefineFunction({
  callback_id: "step_todo_to_pending",
  title: "To Do → Pending Approval",
  description: "Transition by Jira transition.name (env-driven)",
  source_file: "functions/step_todo_to_pending/mod.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
      issueKey: { type: Schema.types.string },
      issueUrl: { type: Schema.types.string },
    },
    required: ["interactivity", "channel_id", "issueKey", "issueUrl"],
  },
  output_parameters: {
    properties: { issueKey: { type: Schema.types.string }, status: { type: Schema.types.string } },
    required: ["issueKey", "status"],
  },
});