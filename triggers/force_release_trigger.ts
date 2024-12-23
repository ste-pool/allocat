import ForceReleaseWorkflow from "../workflows/force_release_workflow.ts";

const ForceReleaseTrigger = {
  type: "shortcut",
  name: "Force release a resource",
  description: "Force release a resource",
  workflow: `#/workflows/${ForceReleaseWorkflow.definition.callback_id}`,
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

export default ForceReleaseTrigger;
