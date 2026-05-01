import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { AllocationMatrixManagerClient, type MatrixRow } from "./AllocationMatrixManagerClient";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";
import { ensureDaisSeatAllocations } from "@/lib/ensure-dais-seat-allocations";
import { getTranslations } from "next-intl/server";

type ConfRow = { id: string; name: string; committee: string | null; committee_code: string | null };

/** Duplicate conference rows (same committee / same tab label) become one tab; extras map to the canonical id. */
function dedupeConferencesForMatrixTabs(
  rows: ConfRow[],
  hasAllocationsById: Map<string, boolean>
): {
  list: ConfRow[];
  resolveConferenceId: (id: string) => string;
} {
  const tabKey = (c: ConfRow) => {
    const comm = c.committee?.trim().toLowerCase();
    if (comm) return `c:${comm}`;
    const n = c.name?.trim().toLowerCase();
    if (n) return `n:${n}`;
    return `id:${c.id}`;
  };
  const resolveToCanonical = new Map<string, string>();

  const groupsByKey = new Map<string, ConfRow[]>();
  for (const c of rows) {
    const k = tabKey(c);
    const existing = groupsByKey.get(k);
    if (existing) existing.push(c);
    else groupsByKey.set(k, [c]);
  }

  // Prefer the canonical conference row that actually has allocation rows.
  const canonicalByKey = new Map<string, ConfRow>();
  for (const [k, groupRows] of groupsByKey.entries()) {
    let primary = groupRows[0];
    const primaryHas = hasAllocationsById.get(primary.id) ?? false;

    for (const r of groupRows) {
      const rHas = hasAllocationsById.get(r.id) ?? false;
      if (rHas && !primaryHas) {
        primary = r;
      }
    }

    canonicalByKey.set(k, primary);
    for (const r of groupRows) resolveToCanonical.set(r.id, primary.id);
  }

  const list = [...canonicalByKey.values()].sort((a, b) => {
    if (!a.committee && !b.committee) return a.name.localeCompare(b.name);
    if (!a.committee) return 1;
    if (!b.committee) return -1;
    const byC = a.committee.localeCompare(b.committee);
    if (byC !== 0) return byC;
    return a.name.localeCompare(b.name);
  });
  return {
    list,
    resolveConferenceId: (id) => resolveToCanonical.get(id) ?? id,
  };
}

function isSmtSecretariatTab(c: ConfRow): boolean {
  const code = c.committee_code?.trim().toUpperCase() ?? "";
  if (code === SMT_COMMITTEE_CODE) return true;
  if (code === "SECRETARIAT2027") return true; // legacy six-char migration order
  return c.committee?.trim().toLowerCase() === "smt";
}

/** Secretariat / SMT sheet always appears first in the tab strip. */
function pinSmtCommitteeFirst(rows: ConfRow[]): ConfRow[] {
  const smt: ConfRow[] = [];
  const rest: ConfRow[] = [];
  for (const c of rows) {
    if (isSmtSecretariatTab(c)) smt.push(c);
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
  if (!unfiltered.some((c) => isSmtSecretariatTab(c))) {
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
  const filtered = unfiltered.filter((c) => {
    const name = c.name?.trim().toLowerCase();
    const committee = c.committee?.trim().toLowerCase();
    return name !== "seamun i 2027" && committee !== "seamun i 2027";
  });
  // Safety valve: never hide the entire matrix. If filtering removes every row,
  // fall back to the raw conference list.
  const rawList = filtered.length > 0 ? filtered : unfiltered;

  // If multiple conference rows map to the same tab label (duplicate committee),
  // choose the canonical row that has allocations so the roster isn't empty.
  const rawListIds = rawList.map((c) => c.id);
  const { data: allocPresence } = rawListIds.length
    ? await supabase
        .from("allocations")
        .select("conference_id")
        .in("conference_id", rawListIds)
    : { data: [] as { conference_id: string }[] };

  const hasAllocationsById = new Map<string, boolean>();
  for (const a of allocPresence ?? []) {
    if (!a.conference_id) continue;
    hasAllocationsById.set(a.conference_id, true);
  }

  const deduped = dedupeConferencesForMatrixTabs(rawList, hasAllocationsById);
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
      ).data ?? [];

    // If a committee has zero allocations yet, pre-create head-chair/co-chair rows
    // so the roster isn't empty on first load.
    if (allocs.length === 0) {
      try {
        await ensureDaisSeatAllocations(supabase, selectedConferenceId);
        allocs =
          (
            await supabase
              .from("allocations")
              .select("id, country, user_id")
              .eq("conference_id", selectedConferenceId)
              .order("country", { ascending: true })
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
