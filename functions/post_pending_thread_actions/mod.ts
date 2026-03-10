import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { PostPendingThreadActions } from "./definition.ts";

type ButtonStyle = "primary" | "danger" | undefined;

function normalizeStyle(style?: string): ButtonStyle {
  const value = (style ?? "").trim().toLowerCase();
  if (value === "primary") return "primary";
  if (value === "danger") return "danger";
  return undefined; // default = white
}

function buildButton(
  text?: string,
  actionId?: string,
  value?: string,
  style?: string,
) {
  const cleanText = (text ?? "").trim();
  const cleanActionId = (actionId ?? "").trim();

  if (!cleanText || !cleanActionId) {
    return null;
  }

  const button: Record<string, unknown> = {
    type: "button",
    text: {
      type: "plain_text",
      text: cleanText,
      emoji: true,
    },
    action_id: cleanActionId,
    value: (value ?? "").trim(),
  };

  const normalizedStyle = normalizeStyle(style);
  if (normalizedStyle) {
    button.style = normalizedStyle;
  }

  return button;
}

export default SlackFunction(
  PostPendingThreadActions,
  async ({ inputs, client }) => {
    const buttons = [
      buildButton(
        inputs.button_1_text,
        inputs.button_1_action_id,
        inputs.button_1_value,
        inputs.button_1_style,
      ),
      buildButton(
        inputs.button_2_text,
        inputs.button_2_action_id,
        inputs.button_2_value,
        inputs.button_2_style,
      ),
      buildButton(
        inputs.button_3_text,
        inputs.button_3_action_id,
        inputs.button_3_value,
        inputs.button_3_style,
      ),
    ].filter(Boolean);

    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: inputs.message_text,
        },
      },
    ];

    if (buttons.length > 0) {
      blocks.push({
        type: "actions",
        elements: buttons,
      });
    }

    const res = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_id,
      text: inputs.message_text,
      blocks,
    });

    if (!res.ok || !res.ts) {
      return {
        error: `Failed to post pending thread actions: ${res.error ?? "unknown_error"}`,
      };
    }

    return {
      outputs: {
        reply_ts: res.ts,
      },
    };
  },
);