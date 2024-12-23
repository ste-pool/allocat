import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { AcquireModal } from "../functions/acquire_modal.ts";

const AcquireResourceWorkflow = DefineWorkflow({
  callback_id: "acquire_resource_workflow",
  title: "Borrow a resource",
  description: "Borrow a resource",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
});

const inputForm = AcquireResourceWorkflow.addStep(AcquireModal, {
  interactivity: AcquireResourceWorkflow.inputs.interactivity,
  channel: AcquireResourceWorkflow.inputs.channel,
});

export default AcquireResourceWorkflow;
