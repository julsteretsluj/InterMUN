import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveConferenceId, clearActiveConference } from "@/lib/active-conference-cookie";

export type ActiveConferenceRow = {
  id: string;
  name: string;
  committee: string | null;
  committee_password_hash: string | null;
  room_code: string | null;
};

/** Active committee from room code (cookie). Validates row still exists. */
export async function getResolvedActiveConference(): Promise<ActiveConferenceRow | null> {
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

  return data as ActiveConferenceRow;
}

/**
 * Conference context for the dashboard: cookie first, then (chairs/SMT only) latest conference
 * so staff are not blocked on every tab before setting a room code.
 */
export async function getConferenceForDashboard(options: {
  role: string | null | undefined;
}): Promise<ActiveConferenceRow | null> {
  const fromCookie = await getResolvedActiveConference();
  if (fromCookie) return fromCookie;

  if (options.role === "chair" || options.role === "smt") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("conferences")
      .select("id, name, committee, committee_password_hash, room_code")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as ActiveConferenceRow) ?? null;
  }

  return null;
}

export async function requireActiveConferenceId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const conf = await getConferenceForDashboard({ role: profile?.role });
  if (!conf) {
    redirect("/room-gate");
  }
  return conf.id;
}
