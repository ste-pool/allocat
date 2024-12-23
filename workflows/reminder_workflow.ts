import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { AcquireReminder } from "../functions/acquire_reminder.ts";

export const ReminderWorkflow = DefineWorkflow({
  callback_id: "reminder_workflow",
  title: "Reminder workflow",
  input_parameters: {
    properties: {
      resource_id: { type: Schema.types.string },
    },
    required: ["resource_id"],
  },
});
ReminderWorkflow.addStep(AcquireReminder, {
  resource_id: ReminderWorkflow.inputs.resource_id,
});

export default ReminderWorkflow;
