import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { StoreReact } from "../functions/react.ts";

const ReactionWorkflow = DefineWorkflow({
  callback_id: "react_workflow",
  title: "React to a reaction",
  description: "React to a reaction",
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
});

ReactionWorkflow.addStep(StoreReact, {
  channel_id: ReactionWorkflow.inputs.channel_id,
  user_id: ReactionWorkflow.inputs.user_id,
  reaction: ReactionWorkflow.inputs.reaction,
  message_ts: ReactionWorkflow.inputs.message_ts,
});

export default ReactionWorkflow;
