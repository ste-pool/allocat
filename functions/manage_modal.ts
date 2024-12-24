import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { queryDatastore } from "./resource_helpers.ts";

const generateMainModal = async (inputs, client) => {
  const main_buttons = {
    type: "actions",
    block_id: "main_menu_block",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Resources",
        },
        style: "primary",
        action_id: "view",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Add Resource",
        },
        style: "primary",
        action_id: "add",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Delete Resources",
        },
        style: "primary",
        action_id: "delete",
      },
    ],
  };

  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "manage-modal",
      title: { type: "plain_text", text: "Manage Resources" },
      close: { type: "plain_text", text: "Close" },
      blocks: [main_buttons],
    },
  };
};

const generateDeleteModal = async (inputs, client) => {
  const get_response = await queryDatastore(client, {
    datastore: RESOURCE_DATASTORE,
    expression: "#channel = :channel",
    expression_attributes: { "#channel": "channel" },
    expression_values: { ":channel": inputs.channel },
  });
  const blocks = [];

  if (!get_response.ok) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: `Error retrieving reserved runs ${get_response.error}`,
      },
    });
  }

  if (get_response.items.length == 0) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: "There are no resources",
      },
    });
  }

  for (const item of get_response.items) {
    if (item.free) {
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
            text: "Delete",
          },
          style: "danger",
          value: "click_me_123",
          action_id: `delete-${item.id}`,
        },
      });
    } else {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${item.resource}* - In use by <@${item.last_borrower}>`,
        },
      });
    }
    blocks.push({ type: "divider" });
  }
  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "delete-modal",
      title: { type: "plain_text", text: "Delete Resources" },
      close: { type: "plain_text", text: "Close" },
      blocks: blocks,
    },
  };
};

const generateViewModal = async (inputs, client) => {
  const user_id = inputs.interactivity.interactor.id;
  const get_response = await queryDatastore(client, {
    datastore: RESOURCE_DATASTORE,
    expression: "#channel = :channel",
    expression_attributes: { "#channel": "channel" },
    expression_values: { ":channel": inputs.channel },
  });
  const blocks = [];

  get_response.items.sort((a, b) => a.resource.localeCompare(b.resource));

  if (!get_response.ok) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: `Error retrieving reserved runs ${get_response.error}`,
      },
    });
  }

  if (get_response.items.length == 0) {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: "There are no resources",
      },
    });
  }

  for (const item of get_response.items) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${item.resource}*`,
      },
    });
    if (!item.free) {
      const release_time =
        Number.parseInt(item.last_borrow_time / 1000) +
        item.last_duration * 3600;

      // The release_time_str is a backup if slack can't parse the !date for whatever reason
      const release_time_str = new Date(
        item.last_borrow_time + item.last_duration * 3600 * 1000,
      ).toISOString();

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Reserved by <@${item.last_borrower}> until: <!date^${release_time}^{date_pretty} at {time}|${release_time_str}>`,
          },
        ],
      });
    }
  }
  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "view-modal",
      title: { type: "plain_text", text: "View Resources" },
      close: { type: "plain_text", text: "Close" },
      blocks: blocks,
    },
  };
};

const generateAddModal = async (inputs, client) => {
  return {
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
      type: "modal",
      callback_id: "add-modal",
      title: { type: "plain_text", text: "Add Resource" },
      close: { type: "plain_text", text: "Close" },
      submit: { type: "plain_text", text: "Add" },
      blocks: [
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "new_resource_name",
          },
          block_id: "new_resource_input",
          label: {
            type: "plain_text",
            text: "Resource Name",
          },
        },
      ],
    },
  };
};

export const ManageModal = DefineFunction({
  callback_id: "manage-modal",
  title: "Manage modal example",
  source_file: "functions/manage_modal.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(ManageModal, async ({ inputs, client }) => {
  const modal = await generateMainModal(inputs, client);
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
    "add-modal",
    async ({ actions, inputs, view, client }) => {
      const uuid = crypto.randomUUID();
      const user_id = inputs.interactivity.interactor.id;
      const resource =
        view.state.values["new_resource_input"]["new_resource_name"].value;

      const get_response = await queryDatastore(client, {
        datastore: RESOURCE_DATASTORE,
        expression: "#channel = :channel and #resource = :resource",
        expression_attributes: {
          "#channel": "channel",
          "#resource": "resource",
        },
        expression_values: {
          ":channel": inputs.channel,
          ":resource": resource,
        },
      });
      if (!get_response.ok) {
        return {
          response_action: "errors",
          errors: { new_resource_input: "Error checking name" },
        };
      }
      if (get_response.items.length > 0) {
        return {
          response_action: "errors",
          errors: {
            new_resource_input: "Resource name in use in this channel",
          },
        };
      }

      const put_response = await client.apps.datastore.put({
        datastore: RESOURCE_DATASTORE,
        item: {
          id: uuid,
          channel: inputs.channel,
          resource: resource,
          free: true,
          last_borrower: user_id,
          last_borrow_time: 0,
          last_duration: 0,
          trigger_id_list: [],
          borrowed_message_id: "",
          last_reminder_message_id: "",
        },
      });

      if (!put_response.ok) {
        return {
          response_action: "errors",
          errors: {
            new_resource_input: `Failed to add resource ${put_response.error}`,
          },
        };
      }
      await client.chat.postMessage({
        channel: inputs.channel,
        text: `*${resource}* has been added as resource to this channel`,
      });
    },
  )
  .addBlockActionsHandler("view", async ({ inputs, body, view, client }) => {
    const contents = await generateViewModal(inputs, client);
    const response = await client.views.update({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view_id: body.view.id,
      view: contents.view,
    });
  })
  .addBlockActionsHandler("add", async ({ inputs, body, view, client }) => {
    const contents = await generateAddModal(inputs, client);
    const response = await client.views.update({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view_id: body.view.id,
      view: contents.view,
    });
  })
  .addBlockActionsHandler("delete", async ({ inputs, body, view, client }) => {
    const contents = await generateDeleteModal(inputs, client);
    const response = await client.views.update({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view_id: body.view.id,
      view: contents.view,
    });
  })
  .addBlockActionsHandler(
    RegExp("^delete-.*$"),
    async ({ action, inputs, body, view, client }) => {
      const resource_id = action.action_id.slice(7);

      const get_response = await client.apps.datastore.get({
        datastore: RESOURCE_DATASTORE,
        id: resource_id,
      });

      if (!get_response.ok) {
        console.log(`Failed to retrieve resources: ${get_response.error}`);
      } else if (get_response.item.free) {
        const delete_response = await client.apps.datastore.delete({
          datastore: RESOURCE_DATASTORE,
          id: resource_id,
        });
        if (!delete_response.ok) {
          console.log(`Failed to delete resources: ${delete_response.error}`);
        } else {
          await client.chat.postMessage({
            channel: inputs.channel,
            text: `${get_response.item.resource} has been deleted as a resource from this channel`,
          });
        }
      }

      const contents = await generateDeleteModal(inputs, client);
      const response = await client.views.update({
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view_id: body.view.id,
        view: contents.view,
      });
    },
  );
