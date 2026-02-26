import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const JiraStateMachine = DefineFunction({
  callback_id: "jira_state_machine",
  title: "Jira State Machine",
  description: "Refresh Jira status, then execute the next transition",
  source_file: "functions/jira_state_machine/mod.ts",

  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
      issueKey: { type: Schema.types.string, description: "KAN-123" },
    },
    required: ["interactivity", "channel_id", "issueKey"],
  },

  output_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      issueKey: { type: Schema.types.string },
      status: { type: Schema.types.string },
      updatedBy: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity", "issueKey", "status", "updatedBy"],
  },
});