import { Trigger } from "deno-slack-api/types.ts";
import ManageResourceWorkflow from "../workflows/manage_workflow.ts";

const ManageResourceTrigger = {
  type: "shortcut",
  name: "Manage resources",
  description: "Manages resources",
  workflow: `#/workflows/${ManageResourceWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: "{{data.interactivity}}",
    },
    channel: {
      value: "{{data.channel_id}}",
    },
    user_id: {
      value: "{{data.user_id}}",
    },
  },
};

export default ManageResourceTrigger;
