import { Manifest } from "deno-slack-sdk/mod.ts";
import SampleObjectDatastore from "./datastores/sample_datastore.ts";
import { PostParentMessageFunction } from "./functions/post_parent_message/mod.ts"; 
import { PostThreadReplyFunction } from "./functions/post_thread_reply/mod.ts";
import { StepTodoToPending } from "./functions/step_todo_to_pending/definition.ts";
import { StepPendingToApproved } from "./functions/step_pending_to_approved/definition.ts";
import { StepApprovedToInProcess } from "./functions/step_approved_to_in_process/definition.ts";
import { StepInProcessToInReview } from "./functions/step_in_process_to_in_review/definition.ts";
import { StepInReviewToDone } from "./functions/step_in_review_to_done/definition.ts";
import { PostPendingThreadActions } from "./functions/post_pending_thread_actions/definition.ts";
import { PostThreadReplyWithButton } from "./functions/post_thread_reply_with_button/definition.ts";
import { PostParentMessageFunctionSlack } from "./functions/post_parent_message_with_slack/mod.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "jira-app-thread-v1",
  description: "a thread reply app for jira",
  icon: "assets/default_new_app_icon.png",
  workflows: [],
  outgoingDomains: [],
  datastores: [SampleObjectDatastore],
  functions: [
    PostParentMessageFunction,
    PostThreadReplyFunction,
    PostPendingThreadActions,
    PostThreadReplyWithButton,
    PostParentMessageFunctionSlack,
    StepTodoToPending,
    StepPendingToApproved,
    StepApprovedToInProcess,
    StepInProcessToInReview,
    StepInReviewToDone,
  ],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "datastore:read",
    "datastore:write",
  ],
  outgoingDomains: ["it-providers.atlassian.net"],
});
