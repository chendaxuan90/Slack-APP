import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const StepInProcessToInReview = DefineFunction({
  callback_id: "step_in_process_to_in_review",
  title: "In Process → In Review",
  description: "Transition by Jira transition.name (env-driven)",
  source_file: "functions/step_in_process_to_in_review/mod.ts",
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