import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { release_resource } from "./resource_helpers.ts";

const generate_release_modal = async (inputs, client) => {
  const user_id = inputs.interactivity.interactor.id;
  const getResponse = await client.apps.datastore.query({
    datastore: RESOURCE_DATASTORE,
    expression: "#channel = :channel and #free <> :free",
    expression_attributes: {
      "#channel": "channel",
      "#free": "free",
    },
    expression_values: {
      ":channel": inputs.channel,
      ":free": true,
    },
  });

  if (!getResponse.ok) {
    return [
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `Error retrieving reserved runs ${getResponse.error}`,
        },
      },
    ];
  }

  if (getResponse.items.length == 0) {
    return [];
  }

  const options = [];
  for (const item of getResponse.items) {
    const release_time =
      Number.parseInt(item.last_borrow_time / 1000) + item.last_duration * 3600;

    // The release_time_str is a backup if slack can't parse the !date for whatever reason
    const release_time_str = new Date(
      item.last_borrow_time + item.last_duration * 3600 * 1000,
    ).toISOString();
    options.push({
      text: {
        type: "mrkdwn",
        text: `*${item.resource}* Reserved by <@${item.last_borrower}>`,
      },
      value: item.id,
    });
  }

  const blocks = [
    {
      type: "input",
      label: {
        type: "plain_text",
        text: "Select resources",
        emoji: false,
      },
      block_id: "input_resource",
      element: {
        type: "checkboxes",
        options: options,
        action_id: "selected_resources",
      },
    },
  ];
  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "force-release",
      title: { type: "plain_text", text: "Release Resources" },
      submit: { type: "plain_text", text: "Release Resources" },
      close: { type: "plain_text", text: "Close" },
      blocks: blocks,
    },
  };
};

export const ForceRelease = DefineFunction({
  callback_id: "force-release",
  title: "Force release modal",
  source_file: "functions/force_release.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(ForceRelease, async ({ inputs, client }) => {
  const modal = await generate_release_modal(inputs, client);
  console.log(modal);
  const response = await client.views.open(modal);
  if (response.error) {
    const error = `Failed to open a modal (error: ${response.error})`;
    return { error };
  }

  return {
    completed: false,
  };
}).addViewSubmissionHandler(
  "force-release",
  async ({ inputs, view, client }) => {
    for (const option of view.state.values.input_resource.selected_resources
      .selected_options) {
      await release_resource(
        client,
        option.value,
        inputs.interactivity.interactor.id,
      );
    }
  },
);
