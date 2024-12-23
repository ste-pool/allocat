import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ManageModal } from "../functions/manage_modal.ts";

const ManageResourceWorkflow = DefineWorkflow({
  callback_id: "manage_resource_workflow",
  title: "Manage resources wf ",
  description: "Manage resources wf ",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
});
const inputForm1 = ManageResourceWorkflow.addStep(ManageModal, {
  interactivity: ManageResourceWorkflow.inputs.interactivity,
  channel: ManageResourceWorkflow.inputs.channel,
});

export default ManageResourceWorkflow;
