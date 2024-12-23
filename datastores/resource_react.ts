import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const RESOURCE_REACT_DATASTORE = "react_datastore";

const ResourceReactDatastore = DefineDatastore({
  name: RESOURCE_REACT_DATASTORE,
  primary_key: "id",
  attributes: {
    id: {
      type: Schema.types.string,
    },
    resource_id: {
      type: Schema.types.string,
    },
    user_id: {
      type: Schema.slack.types.user_id,
    },
  },
});

export default ResourceReactDatastore;
