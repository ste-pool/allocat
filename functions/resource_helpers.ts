import { RESOURCE_DATASTORE } from "../datastores/resource_acquisition.ts";
import { RESOURCE_REACT_DATASTORE } from "../datastores/resource_react.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";

const removeTriggers = async (client, item) => {
  if (item.trigger_id_list) {
    for (const trigger_id of item.trigger_id_list) {
      const resp1 = await client.workflows.triggers.delete({
        trigger_id: trigger_id,
      });
      if (!resp1.ok) {
        console.error(`Error removing old workflow trigger ${trigger_id}`);
      }
    }
  }
};

export const borrowResource = async (
  client,
  user_id,
  duration,
  resource_id,
  channel_id,
) => {
  const get_response = await client.apps.datastore.get({
    datastore: RESOURCE_DATASTORE,
    id: resource_id,
  });

  if (
    !get_response.ok ||
    (get_response.item.last_borrower != user_id && !get_response.item.free)
  ) {
    await client.chat.postEphemeral({
      user: user_id,
      channel: channel_id,
      text: "Error acquiring resource",
    });
    return;
  }

  if (get_response.item.last_reminder_message_id) {
    await client.chat.delete({
      channel: get_response.item.last_borrower,
      ts: get_response.item.last_reminder_message_id,
    });
  }

  const release_trigger = await client.workflows.triggers.create({
    type: TriggerTypes.Scheduled,
    name: "Resource reminder message",
    workflow: `#/workflows/reminder_workflow`, // Not sure why but we can't dynamically access the name
    inputs: {
      resource_id: { value: resource_id },
    },
    schedule: {
      start_time: new Date(
        new Date().getTime() + duration * 1000 * 3600,
      ).toISOString(),
      frequency: {
        type: "once",
      },
    },
  });

  if (!release_trigger.ok) {
    await client.chat.postEphemeral({
      user: user_id,
      channel: channel_id,
      text: `Failed to acquire resource - ${release_trigger.error}`,
    });
  } else {
    const update_response = await client.apps.datastore.update({
      datastore: RESOURCE_DATASTORE,
      item: {
        id: resource_id,
        free: false,
        last_borrower: user_id,
        last_borrow_time: Date.now(),
        last_duration: duration,
        trigger_id_list: [release_trigger.trigger.id],
        last_reminder_message_id: "",
      },
    });

    if (!update_response.ok) {
      await client.chat.postEphemeral({
        user: user_id,
        channel: channel_id,
        text: `Failed to acquire resource - ${update_response.error}`,
      });
    } else {
      const message_response = await client.chat.postMessage({
        channel: channel_id,
        text: `<@${user_id}> borrowed *${update_response.item.resource}* for ${duration} hour(s).`,
      });
      await client.apps.datastore.update({
        datastore: RESOURCE_DATASTORE,
        item: {
          id: resource_id,
          borrowed_message_id: message_response.ts,
        },
      });
    }
  }
  // removing any old triggers has to happen at the end
  // as this could invalidate the token used in client api calls
  await removeTriggers(client, get_response.item);
};

export const releaseResource = async (client, resource_id, release_person) => {
  const get_response = await client.apps.datastore.get({
    datastore: RESOURCE_DATASTORE,
    id: resource_id,
  });

  if (!get_response.ok) {
    console.error(`Failed to retrieve resources: ${get_response.error}`);
    return {};
  }

  // Delete any reminder messages
  const update_response = await client.apps.datastore.update({
    datastore: RESOURCE_DATASTORE,
    item: {
      id: resource_id,
      free: true,
      trigger_id_list: [],
      borrowed_message_id: "",
      last_reminder_message_id: "",
    },
  });

  if (update_response.ok) {
    if (get_response.item.last_reminder_message_id) {
      await client.chat.delete({
        channel: get_response.item.last_borrower,
        ts: get_response.item.last_reminder_message_id,
      });
    }

    if (release_person == get_response.item.last_borrower) {
      await client.chat.postMessage({
        channel: get_response.item.channel,
        text: `<@${release_person}> returned *${get_response.item.resource}*.`,
      });
    } else {
      await client.chat.postMessage({
        channel: get_response.item.channel,
        text: `<@${release_person}> forced release *${get_response.item.resource}* (from <@${get_response.item.last_borrower}>).`,
      });
    }

    // And notify any watchers
    const reactResponse = await client.apps.datastore.query({
      datastore: RESOURCE_REACT_DATASTORE,
      expression: "#resource_id = :resource_id",
      expression_attributes: { "#resource_id": "resource_id" },
      expression_values: { ":resource_id": resource_id },
    });
    if (reactResponse.ok) {
      for (const item of reactResponse.items) {
        await client.chat.postMessage({
          channel: item.user_id,
          text: `Resource *${get_response.item.resource}* in <#${get_response.item.channel}> is now free.`,
        });
      }
      await client.apps.datastore.bulkDelete({
        datastore: RESOURCE_REACT_DATASTORE,
        ids: reactResponse.items.map((v) => v.id),
      });
    }
  } else {
    console.error(`Failed to acquire resource: ${update_response.error}`);
  }
  // removing any old triggers has to happen at the end
  // as this could invalidate the token used in client api calls
  await removeTriggers(client, get_response.item);
};
