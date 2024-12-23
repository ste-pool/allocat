import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const RESOURCE_DATASTORE = "allocate_resource_datastore";

const ResourceDatastore = DefineDatastore({
  name: RESOURCE_DATASTORE,
  primary_key: "id",
  attributes: {
    id: {
      type: Schema.types.string,
    },
    channel: {
      type: Schema.slack.types.channel_id,
    },
    resource: {
      type: Schema.types.string,
    },
    free: {
      type: Schema.types.boolean,
    },
    last_borrower: {
      type: Schema.slack.types.user_id,
    },
    last_borrow_time: {
      type: Schema.types.number,
    },
    last_duration: {
      type: Schema.types.number,
    },
    trigger_id_list: {
      type: Schema.types.array,
      items: {
        type: Schema.types.string,
      },
    },
    borrowed_message_id: {
      type: Schema.types.string,
    },
    last_reminder_message_id: {
      type: Schema.types.string,
    },
  },
});

export default ResourceDatastore;
