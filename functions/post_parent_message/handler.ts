import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { PostParentMessageFunction } from "./mod.ts";

export default SlackFunction(
  PostParentMessageFunction,
  async ({ inputs, client }) => {
    const res = await client.chat.postMessage({
      channel: inputs.channel_id,
      text: inputs.message_text,
    });

    if (!res.ok || !res.ts) {
      return {
        error: `Failed to post parent message: ${res.error ?? "unknown_error"}`,
      };
    }

    return {
      outputs: {
        channel_id: inputs.channel_id,
        thread_ts: res.ts,
      },
    };
  },
);