import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { RESOURCE_REACT_DATASTORE } from "../datastores/resource_react.ts";

export const StoreReact = DefineFunction({
  callback_id: "store_react",
  title: "Store a reaction",
  source_file: "functions/react.ts",
  input_parameters: {
    properties: {
      // All the possible inputs from the "reaction_added" event trigger
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "message_ts", "reaction"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(StoreReact, async ({ inputs, client }) => {
  // Find the "Resource borrowed" message to get the resource id
  const get_response = await client.apps.datastore.query({
    datastore: RESOURCE_DATASTORE,
    expression: "#channel = :channel and #message_id = :message_id",
    expression_attributes: {
      "#channel": "channel",
      "#message_id": "borrowed_message_id",
    },
    expression_values: {
      ":channel": inputs.channel_id,
      ":message_id": inputs.message_ts,
    },
  });

  if (get_response.ok) {
    await client.apps.datastore.put({
      datastore: RESOURCE_REACT_DATASTORE,
      item: {
        id: crypto.randomUUID(),
        user_id: inputs.user_id,
        resource_id: get_response.items[0].id,
      },
    });
  } // else: just a reaction on a random message so ignore!

  return { completed: true };
});
