import { Manifest } from "deno-slack-sdk/mod.ts";
import ResourceDatastore from "./datastores/resource_acquisition.ts";
import ResourceReactDatastore from "./datastores/resource_react.ts";
import ManageResourceWorkflow from "./workflows/manage_workflow.ts";
import AcquireResourceWorkflow from "./workflows/acquire_resource_workflow.ts";
import ReactionWorkflow from "./workflows/reaction_workflow.ts";
import ReminderWorkflow from "./workflows/reminder_workflow.ts";
import ForceReleaseWorkflow from "./workflows/force_release_workflow.ts";
import MessageReleaseNotesWorkflow from "./workflows/message_release_notes_workflow.ts";
import AcquireReminder from "./functions/acquire_reminder.ts";

export default Manifest({
  name: "allocat",
  description: "An app for managing resources",
  icon: "assets/cat.png",
  workflows: [
    AcquireResourceWorkflow,
    ReminderWorkflow,
    ManageResourceWorkflow,
    MessageReleaseNotesWorkflow,
    ForceReleaseWorkflow,
    // This adds an extra workflow to watch when reactions happen to notify of a free devices
    // Comment out this and the reactions:read below to stop this from occurring
    ReactionWorkflow,
  ],
  outgoingDomains: [],
  functions: [AcquireReminder],
  datastores: [ResourceDatastore, ResourceReactDatastore],
  botScopes: [
    "commands",
    "triggers:read",
    "triggers:write",
    "chat:write",
    "datastore:read",
    "datastore:write",
    "users:read", // Used to find out user timezone for reminder messages
    "reactions:read", // Used by ReactionWorkflow
  ],
});
