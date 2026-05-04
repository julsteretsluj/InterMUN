import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { AllocationMatrixManagerClient, type MatrixRow } from "./AllocationMatrixManagerClient";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import {
  committeeHintForSmtDaisPlan,
  isEventNameOverlayConferenceRow,
  isSmtSecretariatConferenceRow,
} from "@/lib/smt-conference-filters";
import {
  committeeTabKey,
  pickCanonicalConferenceRowByAllocationScore,
} from "@/lib/conference-committee-canonical";
import { ensureDaisSeatAllocations } from "@/lib/ensure-dais-seat-allocations";
import { compareCommitteeRowsByDifficultyThenLabel } from "@/lib/committee-difficulty-sort";
import { getTranslations } from "next-intl/server";

type ConfRow = { id: string; name: string; committee: string | null; committee_code: string | null };

/** Duplicate conference rows (same committee / same tab label) become one tab; extras map to the canonical id. */
function dedupeConferencesForMatrixTabs(
  rows: ConfRow[],
  allocationRowCountByConferenceId: Map<string, number>,
  linkedUserCountByConferenceId: Map<string, number>
): {
  list: ConfRow[];
  resolveConferenceId: (id: string) => string;
} {
  const resolveToCanonical = new Map<string, string>();

  const groupsByKey = new Map<string, ConfRow[]>();
  for (const c of rows) {
    const k = committeeTabKey(c);
    const existing = groupsByKey.get(k);
    if (existing) existing.push(c);
    else groupsByKey.set(k, [c]);
  }

  // Prefer the canonical row that has allocation rows; tie-break by linked users then row count.
  const canonicalByKey = new Map<string, ConfRow>();
  for (const [k, groupRows] of groupsByKey.entries()) {
    const primary = pickCanonicalConferenceRowByAllocationScore(
      groupRows,
      allocationRowCountByConferenceId,
      linkedUserCountByConferenceId
    );

    canonicalByKey.set(k, primary);
    for (const r of groupRows) resolveToCanonical.set(r.id, primary.id);
  }

  const list = [...canonicalByKey.values()].sort((a, b) =>
    compareCommitteeRowsByDifficultyThenLabel(
      { committee: a.committee, name: a.name },
      { committee: b.committee, name: b.name }
    )
  );
  return {
    list,
    resolveConferenceId: (id) => resolveToCanonical.get(id) ?? id,
  };
}

/** Secretariat / SMT sheet always appears first in the tab strip. */
function pinSmtCommitteeFirst(rows: ConfRow[]): ConfRow[] {
  const smt: ConfRow[] = [];
  const rest: ConfRow[] = [];
  for (const c of rows) {
    if (isSmtSecretariatConferenceRow(c)) smt.push(c);
    else rest.push(c);
  }
  return [...smt, ...rest];
}

export default async function SmtAllocationMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const t = await getTranslations("smtAllocationMatrixPage");
  const { conference: conferenceParam } = await searchParams;
  const supabase = await createClient();
  const eventId = await getActiveEventId();

  if (!eventId) {
    return (
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper p-8 text-center text-brand-muted">
        <p className="mb-4">{t("selectConferenceEventFirst")}</p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fallocation-matrix"
          className="inline-block px-4 py-2 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
        >
          {t("enterConferenceCode")}
        </Link>
      </div>
    );
  }

  let { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  let unfiltered = conferences ?? [];
  if (!unfiltered.some((c) => isSmtSecretariatConferenceRow(c))) {
    const { error: ensureErr } = await supabase.rpc("ensure_smt_secretariat_conference_for_event", {
      p_event_id: eventId,
    });
    if (!ensureErr) {
      const { data: refreshed } = await supabase
        .from("conferences")
        .select("id, name, committee, committee_code")
        .eq("event_id", eventId)
        .order("committee", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      unfiltered = refreshed ?? unfiltered;
    }
  }

  // Some datasets include the overall event name as a conference row; it should not
  // show up as a selectable sheet/tab in the allocation matrix.
  const filtered = unfiltered.filter((c) => !isEventNameOverlayConferenceRow(c));
  // Safety valve: never hide the entire matrix. If filtering removes every row,
  // fall back to the raw conference list.
  const rawList = filtered.length > 0 ? filtered : unfiltered;

  // If multiple conference rows map to the same tab label (duplicate committee),
  // choose the canonical row that has allocations so the roster isn't empty.
  const rawListIds = rawList.map((c) => c.id);
  const { data: allocSummaries } = rawListIds.length
    ? await supabase
        .from("allocations")
        .select("conference_id, user_id")
        .in("conference_id", rawListIds)
    : { data: [] as { conference_id: string; user_id: string | null }[] };

  const allocationRowCountByConferenceId = new Map<string, number>();
  const linkedUserCountByConferenceId = new Map<string, number>();
  for (const a of allocSummaries ?? []) {
    if (!a.conference_id) continue;
    allocationRowCountByConferenceId.set(
      a.conference_id,
      (allocationRowCountByConferenceId.get(a.conference_id) ?? 0) + 1
    );
    if (a.user_id) {
      linkedUserCountByConferenceId.set(
        a.conference_id,
        (linkedUserCountByConferenceId.get(a.conference_id) ?? 0) + 1
      );
    }
  }

  const deduped = dedupeConferencesForMatrixTabs(
    rawList,
    allocationRowCountByConferenceId,
    linkedUserCountByConferenceId
  );
  const list = pinSmtCommitteeFirst(deduped.list);
  const { resolveConferenceId } = deduped;
  // First tab after pinning is the SMT / secretariat sheet when present; otherwise first committee.
  const fallbackConferenceId = list[0]?.id ?? null;

  const selectedConferenceId =
    conferenceParam && rawList.some((c) => c.id === conferenceParam)
      ? resolveConferenceId(conferenceParam)
      : fallbackConferenceId;

  let rows: MatrixRow[] = [];

  if (selectedConferenceId) {
    let allocs =
      (
        await supabase
          .from("allocations")
          .select("id, country, user_id")
          .eq("conference_id", selectedConferenceId)
          .order("country", { ascending: true })
          .order("id", { ascending: true })
      ).data ?? [];

    const selectedConfRow = rawList.find((c) => c.id === selectedConferenceId);
    // Empty committees: seed dais rows. SMT secretariat: always re-run — legacy installs may still
    // have only Head Chair / Co-chair; ensure migrates labels and adds full roster rows (idempotent).
    const shouldEnsureSeatRows =
      allocs.length === 0 ||
      (selectedConfRow ? isSmtSecretariatConferenceRow(selectedConfRow) : false);

    if (shouldEnsureSeatRows) {
      try {
        await ensureDaisSeatAllocations(
          supabase,
          selectedConferenceId,
          selectedConfRow ? committeeHintForSmtDaisPlan(selectedConfRow) : null
        );
        allocs =
          (
            await supabase
              .from("allocations")
              .select("id, country, user_id")
              .eq("conference_id", selectedConferenceId)
              .order("country", { ascending: true })
              .order("id", { ascending: true })
          ).data ?? [];
      } catch {
        // If insert fails (permissions, missing conference, etc.), fall back to empty roster.
      }
    }

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
      <h1 className="font-display text-2xl font-semibold text-brand-navy mb-2">{t("title")}</h1>
      <p className="text-sm text-brand-muted mb-6 max-w-2xl">
        {t("intro")}
      </p>
      <AllocationMatrixManagerClient conferences={list} selectedConferenceId={selectedConferenceId} rows={rows} />
    </div>
  );
}
