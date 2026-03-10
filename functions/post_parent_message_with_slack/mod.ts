import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const PostParentMessageFunctionSlack = DefineFunction({
  callback_id: "post_parent_message_with_slack",
  title: "Post Parent Message With Slack Context",
  description:
    "Post a message to a channel and return thread_ts and message_context for Slack Reply in Thread",

  source_file: "functions/post_parent_message_with_slack/handler.ts",

  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      message_text: {
        type: Schema.types.string,
      },
    },
    required: ["channel_id", "message_text"],
  },

  output_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      thread_ts: {
        type: Schema.types.string,
      },
      message_context: {
        type: Schema.slack.types.message_context,
      },
    },
    required: ["channel_id", "thread_ts", "message_context"],
  },
});