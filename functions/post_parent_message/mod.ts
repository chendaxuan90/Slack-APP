import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const PostParentMessageFunction = DefineFunction({
  callback_id: "post_parent_message",
  title: "Post Parent Message",
  description: "Post a message in a channel and return channel_id and thread_ts",
  source_file: "functions/post_parent_message/handler.ts",
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
    },
    required: ["channel_id", "thread_ts"],
  },
});