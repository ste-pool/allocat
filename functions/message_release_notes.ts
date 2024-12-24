import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { versions } from "../versions.ts";
import { queryDatastore } from "./resource_helpers.ts";

export const MessageReleaseNotes = DefineFunction({
  callback_id: "release-notes",
  title: "Release notes",
  source_file: "functions/message_release_notes.ts",
});

export default SlackFunction(
  MessageReleaseNotes,
  async ({ inputs, client }) => {
    const get_response = await queryDatastore(client, {
      datastore: RESOURCE_DATASTORE,
    });

    const channel_ids = new Set(get_response.items.map((item) => item.channel));

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
