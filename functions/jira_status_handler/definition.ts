import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const JiraStatusHandler = DefineFunction({
  callback_id: "jira_status_handler",
  title: "Jira Status Handler",
  description: "Post current status + button; on click, transition Jira issue and update message",
  source_file: "functions/jira_status_handler/mod.ts",

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
    properties: {
      status: { type: Schema.types.string },
      updatedBy: { type: Schema.slack.types.user_id },
    },
    required: ["status", "updatedBy"],
  },
});