import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { CommitteePersonView } from "@/components/committee-room/CommitteePersonView";

export default async function SmtCommitteePersonPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id, personId } = await params;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  const { data: conf } = await supabase
    .from("conferences")
    .select("id, event_id")
    .eq("id", id)
    .maybeSingle();
  if (!conf || (eventId && conf.event_id !== eventId)) notFound();

  const bundle = await getResolvedDebateConferenceBundle(supabase, conf.id);

  return (
    <CommitteePersonView
      conferenceId={bundle.debateConferenceId}
      personId={personId}
      backHref={`/smt/committees/${conf.id}?tab=room`}
      backLabel="Committee room"
      showChat={false}
    />
  );
}
