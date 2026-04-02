import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { AllocationMatrixManagerClient, type MatrixRow } from "./AllocationMatrixManagerClient";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";

export default async function SmtAllocationMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const { conference: conferenceParam } = await searchParams;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">Select a conference event first.</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fallocation-matrix"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          Enter conference code
        </Link>
      </div>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const list = conferences ?? [];
  const selectedConferenceId =
    conferenceParam && list.some((c) => c.id === conferenceParam)
      ? conferenceParam
      : list[0]?.id ?? null;

  let rows: MatrixRow[] = [];

  if (selectedConferenceId) {
    const { data: allocs } = await supabase
      .from("allocations")
      .select("id, country, user_id")
      .eq("conference_id", selectedConferenceId)
      .order("country", { ascending: true });

    const ids = (allocs ?? []).map((a) => a.id);
    const { data: codes } = ids.length
      ? await supabase.from("allocation_gate_codes").select("allocation_id, code").in("allocation_id", ids)
      : { data: [] as { allocation_id: string; code: string | null }[] };

    const codeById = new Map((codes ?? []).map((c) => [c.allocation_id, c.code ?? null]));
    const userIds = [
      ...new Set((allocs ?? []).map((a) => a.user_id).filter((id): id is string => Boolean(id))),
    ];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, role, name").in("id", userIds)
      : { data: [] as { id: string; role: string | null; name: string | null }[] };
    const profileById = new Map(
      (profiles ?? []).map((p) => [p.id, { role: p.role ?? null, name: p.name ?? null }])
    );
    rows = sortRowsByAllocationCountry(
      (allocs ?? []).map((a) => ({
        id: a.id,
        country: a.country,
        user_id: a.user_id,
        linked_role: a.user_id ? (profileById.get(a.user_id)?.role ?? null) : null,
        linked_name: a.user_id ? (profileById.get(a.user_id)?.name ?? null) : null,
        code: codeById.get(a.id) ?? null,
      }))
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-brand-navy mb-2">Allocation matrix</h1>
      <p className="text-sm text-brand-muted mb-6 max-w-2xl">
        Build or import the seat list for each committee in the active event. Delegates pick their row at
        the committee gate after sign-in; placard codes can match your spreadsheet IDs.
      </p>
      <AllocationMatrixManagerClient conferences={list} selectedConferenceId={selectedConferenceId} rows={rows} />
    </div>
  );
}
