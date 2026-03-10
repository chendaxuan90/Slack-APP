import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const PostThreadReplyFunction = DefineFunction({
  callback_id: "post_thread_reply",
  title: "Post Thread Reply",
  description: "Post a reply into an existing Slack thread",
  source_file: "functions/post_thread_reply/handler.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel ID where the thread exists",
      },
      thread_id: {
        type: Schema.types.string,
        description: "Parent message ts used for the thread",
      },
      message_text: {
        type: Schema.types.string,
        description: "Reply message text",
      },
    },
    required: ["channel_id", "thread_id", "message_text"],
  },
  output_parameters: {
    properties: {
      reply_ts: {
        type: Schema.types.string,
        description: "Timestamp of the reply message",
      },
    },
    required: ["reply_ts"],
  },
});