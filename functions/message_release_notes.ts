import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { versions } from "../versions.ts";

export const MessageReleaseNotes = DefineFunction({
  callback_id: "release-notes",
  title: "Release notes",
  source_file: "functions/message_release_notes.ts",
});

export default SlackFunction(
  MessageReleaseNotes,
  async ({ inputs, client }) => {
    var cursor = undefined;
    var channel_ids = new Set();

    while (true) {
      const get_response = await client.apps.datastore.query({
        datastore: RESOURCE_DATASTORE,
        limit: 100,
        cursor: cursor,
      });

      if (!get_response.ok) {
        return { completed: true };
      }
      const new_ids = new Set(get_response.items.map((item) => item.channel));
      channel_ids = new Set([...channel_ids, ...new_ids]);

      cursor = get_response.response_metadata?.next_cursor;
      if (!cursor) {
        break;
      }
    }
    for (const channel_id of channel_ids) {
      const resp = await client.chat.postMessage({
        channel: channel_id,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `\n A new version of allocat has been published!\n${versions[0]}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "plain_text",
                text: "You are seeing this message because allocat is managing resources in this channel",
                emoji: true,
              },
            ],
          },
        ],
      });
    }
    return { completed: true };
  },
);
