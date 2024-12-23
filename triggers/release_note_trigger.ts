import MessageReleaseNotesWorkflow from "../workflows/message_release_notes_workflow.ts";

const MessageReleaseNotesTrigger = {
  type: "shortcut",
  name: "Message release notes",
  description: "Message release notes",
  workflow: `#/workflows/${MessageReleaseNotesWorkflow.definition.callback_id}`,
};

export default MessageReleaseNotesTrigger;
