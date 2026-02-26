import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";

import { CreateJiraTask } from "../functions/create_jira_task/definition.ts";

import { StepTodoToPending } from "../functions/step_todo_to_pending/definition.ts";
import { StepPendingToApproved } from "../functions/step_pending_to_approved/definition.ts";
import { StepApprovedToInProcess } from "../functions/step_approved_to_in_process/definition.ts";
import { StepInProcessToInReview } from "../functions/step_in_process_to_in_review/definition.ts";
import { StepInReviewToDone } from "../functions/step_in_review_to_done/definition.ts";

const JiraWorkflow5 = DefineWorkflow({
  callback_id: "jira_workflow_5",
  title: "Jira: Create task + 5 steps",
  description: "Create Jira task and manage 5 transitions step by step",

  input_parameters: {
    properties: {
      // ✅ 必须声明，否则 inputs.interactivity 会是 undefined
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
const created = JiraWorkflow5.addStep(CreateJiraTask, {
  requester: JiraWorkflow5.inputs.interactivity.user.id,
  taskName: JiraWorkflow5.inputs.taskName,
  summary: JiraWorkflow5.inputs.summary,
  description: JiraWorkflow5.inputs.description,
});

// Step 2 — To Do ➡ Pending Approval
const s1 = JiraWorkflow5.addStep(StepTodoToPending, {
  interactivity: JiraWorkflow5.inputs.interactivity,
  channel_id: JiraWorkflow5.inputs.channel_id,
  issueKey: created.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

// Step 3 — Pending Approval ➡ Approved
const s2 = JiraWorkflow5.addStep(StepPendingToApproved, {
  interactivity: JiraWorkflow5.inputs.interactivity,
  channel_id: JiraWorkflow5.inputs.channel_id,
  issueKey: s1.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

// Step 4 — Approved ➡ In Process
const s3 = JiraWorkflow5.addStep(StepApprovedToInProcess, {
  interactivity: JiraWorkflow5.inputs.interactivity,
  channel_id: JiraWorkflow5.inputs.channel_id,
  issueKey: s2.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

// Step 5 — In Process ➡ In Review
const s4 = JiraWorkflow5.addStep(StepInProcessToInReview, {
  interactivity: JiraWorkflow5.inputs.interactivity,
  channel_id: JiraWorkflow5.inputs.channel_id,
  issueKey: s3.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

// Step 6 — In Review ➡ Done
JiraWorkflow5.addStep(StepInReviewToDone, {
  interactivity: JiraWorkflow5.inputs.interactivity,
  channel_id: JiraWorkflow5.inputs.channel_id,
  issueKey: s4.outputs.issueKey,
  issueUrl: created.outputs.issueUrl,
});

export default JiraWorkflow5;