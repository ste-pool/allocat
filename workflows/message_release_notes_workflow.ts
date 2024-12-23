import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { MessageReleaseNotes } from "../functions/message_release_notes.ts";

const MessageReleaseNotesWorkflow = DefineWorkflow({
  callback_id: "mention_new_release",
  title: "Messages users about a new app version that is released.",
  description:
    "Messages any channels that have resources about a new version that has been published.",
});

MessageReleaseNotesWorkflow.addStep(MessageReleaseNotes, {});
export default MessageReleaseNotesWorkflow;
