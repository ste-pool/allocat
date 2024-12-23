import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { borrow_resource, release_resource } from "./resource_helpers.ts";

export const AcquireReminder = DefineFunction({
  callback_id: "acquire-reminder",
  title: "Acquire reminder",
  source_file: "functions/acquire_reminder.ts",
  input_parameters: {
    properties: { resource_id: { type: Schema.types.string } },
    required: ["resource_id"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(AcquireReminder, async ({ inputs, client }) => {
  const get_response = await client.apps.datastore.get({
    datastore: RESOURCE_DATASTORE,
    id: inputs.resource_id,
  });

  if (!get_response.ok) {
    const error = `Failed to retrieve resources: ${get_response.error}`;
    return { error };
  }

  const new_trigger_list = [];
  // Clean up any triggers older than this one
  if (get_response.item.trigger_id_list.length > 0) {
    for (const trigger_id of get_response.item.trigger_id_list.slice(0, -1)) {
      await client.workflows.triggers.delete({ trigger_id: trigger_id });
    }
    new_trigger_list.push(
      get_response.item.trigger_id_list[
        get_response.item.trigger_id_list.length - 1
      ],
    );
  }

  // get users timezone info to stop reminders outside nice times
  var tz_offset = 0;
  var tz_name = "UTC";
  const user_info = await client.users.info({
    user: get_response.item.last_borrower,
  });
  if (user_info.ok) {
    tz_offset = user_info.user.tz_offset;
    tz_name = user_info.user.tz;
  } else {
    console.error("Error finding user timezone. Defaulting to UTC.");
    console.error(user_info);
  }

  // Create another reminder in 15 minutes incase they ignore the message
  // If it is > 8pm then nudge the reminder forward to the next 8am
  const reminder_time = new Date(
    new Date().getTime() + 900000 + tz_offset * 1000,
  );
  if (reminder_time.getHours() >= 20) {
    reminder_time.setDate(reminder_time.getDate() + 1); // this sorts out the month
  }
  if (reminder_time.getHours() < 8 || reminder_time.getHours() >= 20) {
    reminder_time.setHours(8);
    reminder_time.setMinutes(0);
    reminder_time.setSeconds(0);
  }

  const release_trigger = await client.workflows.triggers.create({
    type: TriggerTypes.Scheduled,
    name: "Resource reminder message",
    workflow: "#/workflows/reminder_workflow", // Not sure why but we can't dynamically access the name
    inputs: {
      resource_id: { value: inputs.resource_id },
    },
    schedule: {
      start_time: reminder_time.toISOString(),
      timezone: tz_name,
      frequency: {
        type: "once",
      },
    },
  });

  // Add the new trigger to the list so we can clean it up.
  // (Because of a slack update, you can not delete the trigger you are in and keep interactivity)
  new_trigger_list.push(release_trigger.trigger.id);

  const update_response = await client.apps.datastore.update({
    datastore: RESOURCE_DATASTORE,
    item: {
      id: inputs.resource_id,
      trigger_id_list: new_trigger_list,
    },
  });

  const response = await client.chat.postMessage({
    channel: get_response.item.last_borrower,
    metadata: {
      event_type: "foo",
      event_payload: get_response.item,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Your time with *${get_response.item.resource}* in <#${get_response.item.channel}> has expired, please choose an option:`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Release",
            },
            action_id: "release",
            style: "danger",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Extend 15 mins",
            },
            action_id: "0.25",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Extend 30 mins",
            },
            action_id: "0.5",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Extend 1 hr",
            },
            action_id: "1",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Extend 1 day",
            },
            action_id: "24",
          },
        ],
      },
    ],
  });

  // Remove the old message, if any, now the new one is posted
  if (get_response.item.last_reminder_message_id) {
    await client.chat.delete({
      channel: get_response.item.last_borrower,
      ts: get_response.item.last_reminder_message_id,
    });
  }

  // Update to the new message
  await client.apps.datastore.update({
    datastore: RESOURCE_DATASTORE,
    item: {
      id: inputs.resource_id,
      last_reminder_message_id: response.ts,
    },
  });

  return {
    completed: false,
  };
})
  .addBlockActionsHandler(
    RegExp("^[0-9]+.?[0-9]*$"),
    async ({ action, inputs, body, client }) => {
      const duration = Number.parseFloat(action.action_id);

      const get_response = await client.apps.datastore.get({
        datastore: RESOURCE_DATASTORE,
        id: inputs.resource_id,
      });

      if (!get_response.ok) {
        const error = `Failed to retrieve resources: ${get_response.error}`;
        return { error };
      }

      await borrow_resource(
        client,
        get_response.item.last_borrower,
        duration,
        inputs.resource_id,
        get_response.item.channel,
      );

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  )
  .addBlockActionsHandler(
    ["release"],
    async ({ action, inputs, body, client }) => {
      await release_resource(client, inputs.resource_id, body.user.id);
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    },
  );
