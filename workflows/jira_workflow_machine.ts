import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

import { CreateJiraTask } from "../functions/create_jira_task/definition.ts";
import { JiraStateMachine } from "../functions/jira_state_machine/definition.ts";

const JiraWorkflowMachine = DefineWorkflow({
  callback_id: "jira_workflow_machine",
  title: "Jira: Create task + machine",
  description: "Create Jira task and control transitions via a single state machine",

  input_parameters: {
    properties: {
      // ✅ 必须声明
      interactivity: { type: Schema.slack.types.interactivity },

      channel_id: { type: Schema.slack.types.channel_id, title: "Channel" },
      taskName: { type: Schema.types.string, title: "Task Name" },
      summary: { type: Schema.types.string, title: "Summary" },
      description: { type: Schema.types.string, title: "Description (optional)" },
    },
    required: ["interactivity", "channel_id", "taskName", "summary"],
  },
});

// Step 1 — Create Jira Task
const created = JiraWorkflowMachine.addStep(CreateJiraTask, {
  requester: JiraWorkflowMachine.inputs.interactivity.user.id,
  taskName: JiraWorkflowMachine.inputs.taskName,
  summary: JiraWorkflowMachine.inputs.summary,
  description: JiraWorkflowMachine.inputs.description,
});

// Step 2 — State Machine
JiraWorkflowMachine.addStep(JiraStateMachine, {
  interactivity: JiraWorkflowMachine.inputs.interactivity,
  channel_id: JiraWorkflowMachine.inputs.channel_id,
  issueKey: created.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

export default JiraWorkflowMachine;