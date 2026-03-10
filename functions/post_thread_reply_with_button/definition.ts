import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const PostThreadReplyWithButton = DefineFunction({
  callback_id: "post_thread_reply_with_button",
  title: "Post Thread Reply With Button",
  description: "Post a thread reply with one customizable button",
  source_file: "functions/post_thread_reply_with_button/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      thread_id: {
        type: Schema.types.string,
        description: "Parent message ts used for the thread",
      },
      message_text: {
        type: Schema.types.string,
      },
      button_text: {
        type: Schema.types.string,
        description: "Button label",
      },
      button_action_id: {
        type: Schema.types.string,
        description: "Button action_id",
      },
      button_value: {
        type: Schema.types.string,
        description: "Button value",
      },
      button_style: {
        type: Schema.types.string,
        description: "Use: default / primary / danger",
      },
    },
    required: [
      "channel_id",
      "thread_id",
      "message_text",
      "button_text",
      "button_action_id",
    ],
  },
  output_parameters: {
    properties: {
      reply_ts: {
        type: Schema.types.string,
      },
    },
    required: ["reply_ts"],
  },
});