import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { RoomCodesAndChairsClient } from "./RoomCodesAndChairsClient";

export default async function SmtRoomCodesPage() {
  const supabase = await createClient();
  const eventId = await getActiveEventId();
  const adminInviteConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">Select a conference event first.</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Froom-codes"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          Enter conference code
        </Link>
      </div>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-brand-navy mb-2">Room codes & chairs</h1>
      <p className="text-sm text-brand-muted mb-6 max-w-2xl">
        Set the second-gate committee code for each session and invite or promote dais chairs without
        using the delegate dashboard.
      </p>
      <RoomCodesAndChairsClient
        conferences={conferences ?? []}
        adminInviteConfigured={adminInviteConfigured}
      />
    </div>
  );
}
