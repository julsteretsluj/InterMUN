import { redirect } from "next/navigation";

/** Alias for the chair note-review queue. */
export default function NotesModerationAliasPage() {
  redirect("/chair/notes-moderation");
}
