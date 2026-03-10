import { SlackFunction } from "deno-slack-sdk/mod.ts";
import { PostThreadReplyFunction } from "./mod.ts";

export default SlackFunction(
  PostThreadReplyFunction,
  async ({ inputs, client, logger }) => {
    logger?.info?.(
      `Posting thread reply: channel=${inputs.channel_id}, thread_id=${inputs.thread_id}`,
    );

    const res = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_id,
      text: inputs.message_text,
    });

    logger?.info?.(`chat.postMessage ok=${res.ok}`);
    logger?.info?.(`chat.postMessage error=${res.error ?? "none"}`);
    logger?.info?.(`chat.postMessage ts=${res.ts ?? "none"}`);

    if (!res.ok || !res.ts) {
      return {
        error: `Failed to post thread reply: ${res.error ?? "unknown_error"}`,
      };
    }

    return {
      outputs: {
        reply_ts: res.ts,
      },
    };
  },
);