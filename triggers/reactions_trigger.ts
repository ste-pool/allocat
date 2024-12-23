import ReactionWorkflow from "../workflows/reaction_workflow.ts";

const ReactionResourceTrigger = {
  type: "event",
  name: "React to a reaction",
  description: "React to a reaction",
  workflow: `#/workflows/${ReactionWorkflow.definition.callback_id}`,
  event: {
    event_type: "slack#/events/reaction_added",
    all_resources: true,
    filter: { version: 1, root: { statement: "{{data.reaction}} == eyes" } },
  },
  inputs: {
    channel_id: { value: "{{data.channel_id}}" },
    user_id: { value: "{{data.user_id}}" },
    message_ts: { value: "{{data.message_ts}}" },
    reaction: { value: "{{data.reaction}}" },
  },
};

export default ReactionResourceTrigger;
