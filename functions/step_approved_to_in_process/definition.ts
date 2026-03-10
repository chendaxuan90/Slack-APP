import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const StepApprovedToInProcess = DefineFunction({
  callback_id: "step_approved_to_in_process",
  title: "Approved → In Process",
  description: "Transition by Jira transition.name (env-driven)",
  source_file: "functions/step_approved_to_in_process/mod.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      thread_id: {
        type: Schema.types.string,
      },
      issueKey: {
        type: Schema.types.string,
      },
      issueUrl: {
        type: Schema.types.string,
      },
    },
    required: ["interactivity", "channel_id", "thread_id", "issueKey", "issueUrl"],
  },
  output_parameters: {
    properties: {
      issueKey: {
        type: Schema.types.string,
      },
      status: {
        type: Schema.types.string,
      },
    },
    required: ["issueKey", "status"],
  },
});