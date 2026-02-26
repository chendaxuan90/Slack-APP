import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const CreateJiraTask = DefineFunction({
  callback_id: "create_jira_task",
  title: "Create Jira Task",
  description: "Create a Jira issue (KAN/Task) from Slack workflow",
  source_file: "functions/create_jira_task/mod.ts",

  input_parameters: {
    properties: {
      requester: { type: Schema.slack.types.user_id, description: "Slack user who submitted the form" },
      taskName: { type: Schema.types.string, description: "Task name (required)" },
      summary: { type: Schema.types.string, description: "Summary (required)" },
      description: { type: Schema.types.string, description: "Description (optional)" },
    },
    required: ["requester", "taskName", "summary"],
  },

  output_parameters: {
    properties: {
      issueKey: { type: Schema.types.string },
      issueUrl: { type: Schema.types.string },
    },
    required: ["issueKey", "issueUrl"],
  },
});