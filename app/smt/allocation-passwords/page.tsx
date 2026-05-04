import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AllocationCodeGateToggle } from "@/components/allocation/AllocationCodeGateToggle";
import { AllocationPasswordsClient } from "@/app/(dashboard)/chair/allocation-passwords/AllocationPasswordsClient";
import { compareAllocationCountryDisplay } from "@/lib/allocation-display-order";
import { isDaisSeatAllocationCountry } from "@/lib/dais-seat-plan";
import { isSmtRole } from "@/lib/roles";
import { getTranslations } from "next-intl/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  committeeTabKey,
  pickCanonicalConferenceRowByAllocationScore,
} from "@/lib/conference-committee-canonical";

type ProfileEmbed = { name: string | null } | null;

type ConfRow = { id: string; name: string | null; committee: string | null; committee_code: string | null };

type AllocRow = {
  id: string;
  country: string;
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[];
};

function embedName(p: ProfileEmbed | ProfileEmbed[]): string | null {
  if (p == null) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row?.name?.trim() || null;
}

export default async function SmtAllocationPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const t = await getTranslations("pageTitles");
  const { conference: conferenceParam } = await searchParams;

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

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const eventId = await getActiveEventId();
  if (!eventId) {
    return (
      <MunPageShell title={t("allocationPasswords")}>
        <p className="text-sm text-brand-muted">
          Select an event first, then open this page from the SMT dashboard.
        </p>
        <Link
          href="/event-gate?next=%2Fsmt%2Fallocation-passwords"
          className="mt-4 inline-block text-sm text-brand-accent hover:underline"
        >
          Enter event code
        </Link>
      </MunPageShell>
    );
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_code")
    .eq("event_id", eventId)
    .order("committee", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const rawList = (conferences ?? []) as ConfRow[];
  if (rawList.length === 0) {
    return (
      <MunPageShell title={t("allocationPasswords")}>
        <p className="text-sm text-brand-muted">Create a conference first.</p>
      </MunPageShell>
    );
  }

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

  const groupsByKey = new Map<string, ConfRow[]>();
  for (const c of rawList) {
    const k = committeeTabKey(c);
    const arr = groupsByKey.get(k) ?? [];
    arr.push(c);
    groupsByKey.set(k, arr);
  }

  const resolveToCanonical = new Map<string, string>();
  const tabRows: ConfRow[] = [];
  for (const groupRows of groupsByKey.values()) {
    const primary = pickCanonicalConferenceRowByAllocationScore(
      groupRows,
      allocationRowCountByConferenceId,
      linkedUserCountByConferenceId
    );
    tabRows.push(primary);
    for (const r of groupRows) resolveToCanonical.set(r.id, primary.id);
  }

  tabRows.sort((a, b) => {
    const la = [a.committee, a.name].filter(Boolean).join(" — ") || a.id;
    const lb = [b.committee, b.name].filter(Boolean).join(" — ") || b.id;
    return la.localeCompare(lb);
  });

  const conferenceId =
    conferenceParam && rawList.some((c) => c.id === conferenceParam)
      ? (resolveToCanonical.get(conferenceParam) ?? conferenceParam)
      : tabRows[0]!.id;

  const { data: allocData } = await supabase
    .from("allocations")
    .select("id, country, user_id, profiles(name)")
    .eq("conference_id", conferenceId)
    .order("country");

  const rows = (allocData ?? []) as AllocRow[];
  const ids = rows.map((r) => r.id);

  const { data: codeRows } = ids.length
    ? await supabase
        .from("allocation_gate_codes")
        .select("allocation_id, code")
        .in("allocation_id", ids)
    : { data: [] as { allocation_id: string; code: string | null }[] };

  const codeMap = new Map((codeRows ?? []).map((c) => [c.allocation_id, c.code ?? ""]));

  const merged = rows.map((r) => ({
    allocationId: r.id,
    country: r.country?.trim() || "—",
    delegateUserId: r.user_id ?? null,
    code: codeMap.get(r.id) ?? "",
  }));

  /** Dais / chair (and SMT officer) rows first, then delegates — same intent as allocation matrix ordering. */
  merged.sort((a, b) => {
    const da = isDaisSeatAllocationCountry(a.country);
    const db = isDaisSeatAllocationCountry(b.country);
    if (da !== db) return da ? -1 : 1;
    const byCountry = compareAllocationCountryDisplay(a.country, b.country);
    if (byCountry !== 0) return byCountry;
    return a.allocationId.localeCompare(b.allocationId);
  });

  const activeConf = tabRows.find((c) => c.id === conferenceId);

  const { data: gateConf } = await supabase
    .from("conferences")
    .select("allocation_code_gate_enabled")
    .eq("id", conferenceId)
    .maybeSingle();

  return (
    <MunPageShell title={t("allocationPasswords")}>
      <p className="text-sm text-brand-muted mb-4 max-w-2xl">
        Per-allocation <strong>codes</strong> for placards, binders, or handouts. Optional <strong>third gate</strong>
        : when enabled, each delegate and chair must enter their seat code after committee sign-in. Stored in plain
        text so you can copy this list—treat it like a seating chart (do not share publicly). The shared committee
        password for the second gate is managed from the chair dashboard (dais), not here.
      </p>

      <div className="mb-6 max-w-2xl">
        <AllocationCodeGateToggle
          conferenceId={conferenceId}
          enabled={gateConf?.allocation_code_gate_enabled === true}
        />
      </div>

      {tabRows.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tabRows.map((c) => (
            <Link
              key={c.id}
              href={`/smt/allocation-passwords?conference=${c.id}`}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                c.id === conferenceId
                  ? "bg-brand-paper text-brand-navy border-brand-navy"
                  : "border-brand-navy/20 text-brand-navy hover:bg-brand-cream"
              }`}
            >
              {c.name}
              {c.committee ? ` — ${c.committee}` : ""}
            </Link>
          ))}
        </div>
      )}

      <AllocationPasswordsClient
        conferenceId={conferenceId}
        conferenceLabel={
          [activeConf?.name, activeConf?.committee].filter(Boolean).join(" — ") || "Conference"
        }
        rows={merged}
      />
    </MunPageShell>
  );
}
