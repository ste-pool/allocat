import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import ReminderWorkflow from "../workflows/reminder_workflow.ts";
import { borrow_resource, release_resource } from "./resource_helpers.ts";

const generate_release_buttons = async (inputs, client) => {
  const user_id = inputs.interactivity.interactor.id;
  const getResponse = await client.apps.datastore.query({
    datastore: RESOURCE_DATASTORE,
    expression:
      "#channel = :channel and #last_borrower = :user and #free <> :free",
    expression_attributes: {
      "#channel": "channel",
      "#last_borrower": "last_borrower",
      "#free": "free",
    },
    expression_values: {
      ":channel": inputs.channel,
      ":user": user_id,
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

  const blocks = [{ type: "divider" }];

  getResponse.items.sort((a, b) => a.resource.localeCompare(b.resource));

  for (const item of getResponse.items) {
    const release_time =
      Number.parseInt(item.last_borrow_time / 1000) + item.last_duration * 3600;

    // The release_time_str is a backup if slack can't parse the !date for whatever reason
    const release_time_str = new Date(
      item.last_borrow_time + item.last_duration * 3600 * 1000,
    ).toISOString();
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${item.resource}*`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Release",
        },
        style: "danger",
        value: item.resource,
        action_id: `release-${item.id}`,
      },
    });

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Reserved by you until: <!date^${release_time}^{date_pretty} at {time}|${release_time_str}>`,
        },
      ],
    });
    blocks.push({ type: "divider" });
  }

  return blocks;
};

const generate_borrow_modal = async (inputs, client) => {
  const blocks = await generate_release_buttons(inputs, client);

  const getResponse = await client.apps.datastore.query({
    datastore: RESOURCE_DATASTORE,
    expression: "#channel = :channel and #free = :free",
    expression_attributes: { "#channel": "channel", "#free": "free" },
    expression_values: { ":channel": inputs.channel, ":free": true },
  });
  if (!getResponse.ok) {
    const error = `Failed to retrieve resources: ${getResponse.error}`;
    return { error };
  }

  getResponse.items.sort((a, b) => a.resource.localeCompare(b.resource));

  const freeItems = getResponse.items.map((x) => ({
    text: {
      type: "plain_text",
      text: x.resource,
    },
    value: x.id,
  }));

  if (freeItems.length == 0) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: "There are no free resources available for this channel",
      },
    });
  } else {
    // Add dropdown box
    blocks.push({
      type: "input",
      block_id: "input_resource",
      element: {
        type: "static_select",
        options: freeItems,
        action_id: "selected_resource",
      },
      label: {
        type: "plain_text",
        text: "Hostname",
      },
    });

    // Add reserve time buttons
    blocks.push({
      type: "section",
      block_id: "selected_duration",
      text: {
        type: "mrkdwn",
        text: "How long would you like to reserve for?",
      },
      accessory: {
        type: "radio_buttons",
        initial_option: {
          text: {
            type: "plain_text",
            text: "15 mins",
          },
          value: "0.25",
        },
        action_id: "duration_options",
        options: [
          {
            text: {
              type: "plain_text",
              text: "15 mins",
            },
            value: "0.25",
          },
          {
            text: {
              type: "plain_text",
              text: "30 mins",
            },
            value: "0.5",
          },
          {
            text: {
              type: "plain_text",
              text: "1 hr",
            },
            value: "1",
          },
          {
            text: {
              type: "plain_text",
              text: "2 hr",
            },
            value: "2",
          },
          {
            text: {
              type: "plain_text",
              text: "4 hr",
            },
            value: "4",
          },
          {
            text: {
              type: "plain_text",
              text: "8 hr",
            },
            value: "8",
          },
          {
            text: {
              type: "plain_text",
              text: "1 day",
            },
            value: "24",
          },
          {
            text: {
              type: "plain_text",
              text: "2 days",
            },
            value: "48",
          },
          {
            text: {
              type: "plain_text",
              text: "3 days",
            },
            value: "72",
          },
        ],
      },
    });
  }
  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "acquire-modal",
      title: { type: "plain_text", text: "Acquire Resource" },
      submit: { type: "plain_text", text: "Acquire" },
      close: { type: "plain_text", text: "Close" },
      blocks: blocks,
    },
  };
};

export const AcquireModal = DefineFunction({
  callback_id: "acquire-modal",
  title: "Acquire Resource",
  source_file: "functions/acquire_modal.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(AcquireModal, async ({ inputs, client }) => {
  const modal = await generate_borrow_modal(inputs, client);
  const response = await client.views.open(modal);
  if (response.error) {
    const error = `Failed to open a modal (error: ${response.error})`;
    return { error };
  }

  return {
    completed: false,
  };
})
  .addViewSubmissionHandler(
    "acquire-modal",
    async ({ inputs, view, client }) => {
      const resource_id =
        view.state.values.input_resource.selected_resource.selected_option
          .value;
      const duration = Number.parseFloat(
        view.state.values.selected_duration.duration_options.selected_option
          .value,
      );
      const user_id = inputs.interactivity.interactor.id;

      await borrow_resource(
        client,
        user_id,
        duration,
        resource_id,
        inputs.channel,
      );
      return {};
    },
  )
  .addBlockActionsHandler(
    RegExp("^release-.*$"),
    async ({ action, inputs, body, view, client }) => {
      const resource_id = action.action_id.slice(8);

      await release_resource(client, resource_id, body.user.id);

      const contents = await generate_borrow_modal(inputs, client);
      const response = await client.views.update({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view_id: body.view.id,
        view: contents.view,
      });
    },
  );
