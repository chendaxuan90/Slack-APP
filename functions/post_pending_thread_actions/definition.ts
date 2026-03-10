import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";

export const PostPendingThreadActions = DefineFunction({
  callback_id: "post_pending_thread_actions",
  title: "Post Pending Thread Actions",
  description: "Post a thread reply with custom buttons for Pending stage",
  source_file: "functions/post_pending_thread_actions/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      thread_id: {
        type: Schema.types.string,
        description: "Parent message ts for the thread",
      },
      message_text: {
        type: Schema.types.string,
      },

      button_1_text: {
        type: Schema.types.string,
      },
      button_1_action_id: {
        type: Schema.types.string,
      },
      button_1_value: {
        type: Schema.types.string,
      },
      button_1_style: {
        type: Schema.types.string,
        description: "Use: default / primary / danger",
      },

      button_2_text: {
        type: Schema.types.string,
      },
      button_2_action_id: {
        type: Schema.types.string,
      },
      button_2_value: {
        type: Schema.types.string,
      },
      button_2_style: {
        type: Schema.types.string,
        description: "Use: default / primary / danger",
      },

      button_3_text: {
        type: Schema.types.string,
      },
      button_3_action_id: {
        type: Schema.types.string,
      },
      button_3_value: {
        type: Schema.types.string,
      },
      button_3_style: {
        type: Schema.types.string,
        description: "Use: default / primary / danger",
      },
    },
    required: [
      "channel_id",
      "thread_id",
      "message_text",
      "button_1_text",
      "button_1_action_id",
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