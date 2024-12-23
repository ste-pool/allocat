import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ForceRelease } from "../functions/force_release.ts";

const ForceReleaseWorkflow = DefineWorkflow({
  callback_id: "force_release_workflow",
  title: "Forcibly releases a workflow (use with caution).",
  description: "Forcibly releases a workflow (use with caution).",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
});

ForceReleaseWorkflow.addStep(ForceRelease, {
  interactivity: ForceReleaseWorkflow.inputs.interactivity,
  channel: ForceReleaseWorkflow.inputs.channel,
});
export default ForceReleaseWorkflow;
