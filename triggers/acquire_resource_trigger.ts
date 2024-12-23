import AcquireResourceWorkflow from "../workflows/acquire_resource_workflow.ts";

const AcquireResourceTrigger = {
  type: "shortcut",
  name: "Acquire a resource",
  description: "Borrow a resource for a specified time",
  workflow: `#/workflows/${AcquireResourceWorkflow.definition.callback_id}`,
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

export default AcquireResourceTrigger;
