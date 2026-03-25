import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveConferenceId, clearActiveConference } from "@/lib/active-conference-cookie";

/** Active committee from room code (cookie). Validates row still exists. */
export async function getResolvedActiveConference(): Promise<{
  id: string;
  name: string;
  committee: string | null;
  committee_password_hash: string | null;
  room_code: string | null;
} | null> {
  const id = await getActiveConferenceId();
  if (!id) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_password_hash, room_code")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    await clearActiveConference();
    return null;
  }

  return data as {
    id: string;
    name: string;
    committee: string | null;
    committee_password_hash: string | null;
    room_code: string | null;
  };
}

export async function requireActiveConferenceId(): Promise<string> {
  const conf = await getResolvedActiveConference();
  if (!conf) {
    redirect("/room-gate");
  }
  return conf.id;
}
