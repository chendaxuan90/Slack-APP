import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { PostThreadReplyWithButton } from "./definition.ts";

type ButtonStyle = "primary" | "danger" | undefined;

function normalizeStyle(style?: string): ButtonStyle {
  const value = (style ?? "").trim().toLowerCase();

  if (value === "primary") return "primary";
  if (value === "danger") return "danger";

  // default / empty / anything else => white button
  return undefined;
}

export default SlackFunction(
  PostThreadReplyWithButton,
  async ({ inputs, client }) => {
    const buttonStyle = normalizeStyle(inputs.button_style);

    const button: Record<string, unknown> = {
      type: "button",
      text: {
        type: "plain_text",
        text: inputs.button_text,
        emoji: true,
      },
      action_id: inputs.button_action_id,
      value: inputs.button_value ?? "",
    };

    if (buttonStyle) {
      button.style = buttonStyle;
    }

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: inputs.message_text,
        },
      },
      {
        type: "actions",
        elements: [button],
      },
    ];

    const res = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_id,
      text: inputs.message_text,
      blocks,
    });

    if (!res.ok || !res.ts) {
      return {
        error: `Failed to post thread reply with button: ${res.error ?? "unknown_error"}`,
      };
    }

    return {
      outputs: {
        reply_ts: res.ts,
      },
    };
  },
);