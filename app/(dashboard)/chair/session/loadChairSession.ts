import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";

export type ChairSessionConference = {
  conferenceId: string;
  conferenceTitle: string;
  debateConferenceId: string;
  canonicalConferenceId: string;
  rosterConferenceIds: string[];
  debateTopicOptions: { id: string; label: string }[];
};

/**
 * Chair-only access + active committee. Returns null when no committee is joined (caller shows room-code CTA).
 */
export async function loadChairSessionConference(): Promise<ChairSessionConference | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "chair") {
    if (profile?.role === "smt") {
      redirect("/smt?e=smt-no-session-floor");
    }
    if (profile?.role === "admin") {
      redirect("/admin?e=no-session-floor");
    }
    redirect("/profile");
  }

  const active = await getConferenceForDashboard({ role: "chair" });
  if (!active) return null;

  const bundle = await getResolvedDebateConferenceBundle(supabase, active.id);
  const conferenceTitle = [active.name, active.committee].filter(Boolean).join(" — ");
  return {
    conferenceId: active.id,
    conferenceTitle,
    debateConferenceId: bundle.debateConferenceId,
    canonicalConferenceId: bundle.canonicalConferenceId,
    rosterConferenceIds: bundle.siblingConferenceIds,
    debateTopicOptions: bundle.debateTopicOptions,
  };
}
