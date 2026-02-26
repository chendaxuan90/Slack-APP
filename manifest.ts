import { Manifest } from "deno-slack-sdk/mod.ts";
import SampleObjectDatastore from "./datastores/sample_datastore.ts";
import { CreateJiraTask } from "./functions/create_jira_task/definition.ts";
import { StepTodoToPending } from "./functions/step_todo_to_pending/definition.ts";
import { StepPendingToApproved } from "./functions/step_pending_to_approved/definition.ts";
import { StepApprovedToInProcess } from "./functions/step_approved_to_in_process/definition.ts";
import { StepInProcessToInReview } from "./functions/step_in_process_to_in_review/definition.ts";
import { StepInReviewToDone } from "./functions/step_in_review_to_done/definition.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "jira-app-v2",
  description: "A template for building Slack apps with Deno",
  icon: "assets/default_new_app_icon.png",
  workflows: [],
  outgoingDomains: [],
  datastores: [SampleObjectDatastore],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "datastore:read",
    "datastore:write",
  ],
  functions: [
    CreateJiraTask,
    StepTodoToPending,
    StepPendingToApproved,
    StepApprovedToInProcess,
    StepInProcessToInReview,
    StepInReviewToDone,
  ],
  outgoingDomains: ["it-providers.atlassian.net"],
});
