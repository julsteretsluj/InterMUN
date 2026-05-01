import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import {
  approveAllocationSignupRequestAction,
  rejectAllocationSignupRequestAction,
} from "@/app/actions/allocationSignup";
import { ChairDelegateApprovalByEmailForm } from "./ChairDelegateApprovalByEmailForm";
import { ChairAllocationAutoRefresh } from "./ChairAllocationAutoRefresh";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { EU_PARTY_LABELS, type EuPartyKey } from "@/lib/eu-party-time";
import { getLocale, getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";

type AllocationRow = {
  id: string;
  conference_id: string;
  country: string;
  flag: string;
  email: string | null;
  name: string | null;
  grade: string | null;
  notes: string | null;
  user_id: string | null;
  linked_role: string | null;
  linked_name: string | null;
  country_display: string;
  party_label: string | null;
  member_country: string | null;
};

type SignupRequestRow = {
  id: string;
  requested_by: string;
  status: string;
  allocations:
    | {
        country: string;
      }
    | {
        country: string;
      }[]
    | null;
  profiles:
    | {
        name: string | null;
        username: string | null;
      }
    | {
        name: string | null;
        username: string | null;
      }[]
    | null;
};

function firstEmbed<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const EU_PARTY_TOKEN_TO_KEY: Record<string, EuPartyKey> = {
  "s&d": "s_and_d",
  "s and d": "s_and_d",
  "socialists and democrats": "s_and_d",
  epp: "epp",
  "european people's party": "epp",
  "european peoples party": "epp",
  renew: "renew",
  "renew europe": "renew",
  left: "left",
  "the left": "left",
  lefts: "left",
  green: "green",
  greens: "green",
  "greens efa": "green",
  "greens/efa": "green",
  "c&r": "c_and_r",
  "c and r": "c_and_r",
  ecr: "c_and_r",
  "conservatives and reformists": "c_and_r",
  "european conservatives and reformists": "c_and_r",
  patriots: "patriots",
  pfe: "patriots",
  "patriots for europe": "patriots",
  ni: "independents",
  independents: "independents",
  "non inscrits": "independents",
  "non-inscrits": "independents",
};

function normalizePartyToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^\w&/+-]+/g, " ")
    .trim();
}

function parseEuParty(countryLabel: string): EuPartyKey | null {
  const trimmed = countryLabel.trim();
  if (!trimmed) return null;
  const tailParens = trimmed.match(/\(([^)]+)\)\s*$/)?.[1]?.trim();
  const dashTail = trimmed.split(/\s[-–—]\s/).at(-1)?.trim();
  const candidates = [tailParens, dashTail, trimmed];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const norm = normalizePartyToken(candidate);
    if (!norm) continue;
    const direct = EU_PARTY_TOKEN_TO_KEY[norm];
    if (direct) return direct;
    for (const [token, key] of Object.entries(EU_PARTY_TOKEN_TO_KEY)) {
      if (norm.includes(token)) return key;
    }
  }
  return null;
}

function stripTrailingEuParty(rawCountry: string) {
  const tailParens = rawCountry.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? "";
  const tailParensNorm = normalizePartyToken(tailParens);
  const withoutParens =
    tailParensNorm && EU_PARTY_TOKEN_TO_KEY[tailParensNorm]
      ? rawCountry.replace(/\s*\(([^)]+)\)\s*$/g, "").trim()
      : rawCountry.trim();
  const dashMatch = withoutParens.match(/^(.*?)\s[-–—]\s(.+)$/);
  if (!dashMatch) return withoutParens;
  const tail = normalizePartyToken(dashMatch[2] ?? "");
  if (!tail) return withoutParens;
  if (EU_PARTY_TOKEN_TO_KEY[tail]) return (dashMatch[1] ?? "").trim();
  return withoutParens;
}

const EU_MEMBER_COUNTRY_BY_NAME: Record<string, string> = {
  "Agnes Jongerius": "Netherlands",
  "Assita Kanko": "Belgium",
  "Christine Lagarde": "France",
  "Dennis Radtke": "Germany",
  "Dragos Pislaru": "Romania",
  "Fabienne Keller": "France",
  "Gabriele Bischoff": "Germany",
  "Iratxe Garxia Perez": "Spain",
  "Jodan Bardella": "France",
  "Jose Gusmao": "Portugal",
  "Juan Fernando Lopez Aguilar": "Spain",
  "Kinga Gal": "Hungary",
  "Lena Dupont": "Germany",
  "Liina Carr": "Estonia",
  "Manfred Weber": "Germany",
  "Manon Aubry": "France",
  "Morten Lokkegaard": "Denmark",
  "Nicola Procaccini": "Italy",
  "Nicolas Schmit": "Luxembourg",
  "Roberta Metsola": "Malta",
  "Saskia Bricmont": "Belgium",
  "Siegfried Muresan": "Romania",
  "Terry Reintke": "Germany",
  "Valerie Hayer": "France",
  "Ylva Johansson": "Sweden",
};

const EU_MEMBER_PARTY_BY_NAME: Record<string, EuPartyKey> = {
  "Agnes Jongerius": "s_and_d",
  "Assita Kanko": "c_and_r",
  "Christine Lagarde": "independents",
  "Dennis Radtke": "epp",
  "Dragos Pislaru": "renew",
  "Fabienne Keller": "renew",
  "Gabriele Bischoff": "s_and_d",
  "Iratxe Garxia Perez": "s_and_d",
  "Jodan Bardella": "patriots",
  "Jose Gusmao": "left",
  "Juan Fernando Lopez Aguilar": "s_and_d",
  "Kinga Gal": "patriots",
  "Lena Dupont": "epp",
  "Liina Carr": "independents",
  "Manfred Weber": "epp",
  "Manon Aubry": "left",
  "Morten Lokkegaard": "renew",
  "Nicola Procaccini": "c_and_r",
  "Nicolas Schmit": "s_and_d",
  "Roberta Metsola": "epp",
  "Saskia Bricmont": "green",
  "Siegfried Muresan": "epp",
  "Terry Reintke": "green",
  "Valerie Hayer": "renew",
  "Ylva Johansson": "s_and_d",
};

export default async function ChairAllocationMatrixPage() {
  const t = await getTranslations("pageTitles");
  const tMatrix = await getTranslations("chairAllocationMatrixPage");
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
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

  if (profile?.role !== "chair" && profile?.role !== "smt" && profile?.role !== "admin") {
    redirect("/profile");
  }

  const activeConf = await getConferenceForDashboard({ role: profile?.role });
  if (!activeConf) {
    redirect("/room-gate?next=%2Fchair%2Fallocation-matrix");
  }

  const { data: allocData } = await supabase
    .from("allocations")
    .select("id, conference_id, country, user_id")
    .eq("conference_id", activeConf.id)
    .order("country", { ascending: true });

  const rawRows = (allocData ?? []) as Omit<
    AllocationRow,
    | "flag"
    | "email"
    | "name"
    | "grade"
    | "notes"
    | "linked_role"
    | "linked_name"
    | "country_display"
    | "party_label"
  >[];
  const allocationIds = rawRows.map((r) => r.id);
  let gateCodeRows: { allocation_id: string; code: string | null }[] = [];
  if (allocationIds.length > 0) {
    const { data: gateCodeData } = await supabase
      .from("allocation_gate_codes")
      .select("allocation_id, code")
      .in("allocation_id", allocationIds);
    gateCodeRows = (gateCodeData as { allocation_id: string; code: string | null }[] | null) ?? [];

    // Admins can open this page but allocation_gate_codes RLS historically targets chair/smt.
    // Fall back to service-role read if needed so metadata still renders.
    if (gateCodeRows.length === 0 && profile?.role === "admin") {
      const admin = createAdminClient();
      if (admin) {
        const { data: adminGateCodes } = await admin
          .from("allocation_gate_codes")
          .select("allocation_id, code")
          .in("allocation_id", allocationIds);
        gateCodeRows =
          (adminGateCodes as { allocation_id: string; code: string | null }[] | null) ?? gateCodeRows;
      }
    }
  }
  const gateCodeByAllocationId = new Map<string, string>();
  for (const row of gateCodeRows) {
    const code = row.code?.trim() ?? "";
    if (!code) continue;
    const prev = gateCodeByAllocationId.get(row.allocation_id);
    const codeIsParty = parseEuParty(code) !== null;
    const prevIsParty = prev ? parseEuParty(prev) !== null : false;
    if (!prev || (codeIsParty && !prevIsParty)) {
      gateCodeByAllocationId.set(row.allocation_id, code);
    }
  }
  const userIds = [
    ...new Set(rawRows.map((r) => r.user_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, role, name, grade, notes")
        .in("id", userIds)
    : {
        data: [] as {
          id: string;
          role: string | null;
          name: string | null;
          grade: string | null;
          notes: string | null;
        }[],
      };
  const emailByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const admin = createAdminClient();
    if (admin) {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (!usersError) {
        const userSet = new Set(userIds);
        for (const u of usersData.users) {
          if (u.id && u.email && userSet.has(u.id)) emailByUserId.set(u.id, u.email);
        }
      }
    }
  }
  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        role: p.role ?? null,
        name: p.name ?? null,
        grade: p.grade ?? null,
        notes: p.notes ?? null,
      },
    ])
  );
  const hasEuNameSignals = rawRows.some((r) => Boolean(EU_MEMBER_COUNTRY_BY_NAME[r.country]));
  const hasEuPartySignals = gateCodeRows.some((row) => parseEuParty(row.code ?? "") !== null);
  const isEuParliament =
    activeConf.procedure_profile === "eu_parliament" || hasEuNameSignals || hasEuPartySignals;
  const rows: AllocationRow[] = sortRowsByAllocationCountry(
    rawRows.map((r) => {
      const normalizedSeat = (r.country ?? "").trim().toLowerCase();
      const isChairSeat =
        normalizedSeat === "head chair" ||
        normalizedSeat === "co-chair" ||
        normalizedSeat === "co chair" ||
        normalizedSeat.includes("chair");
      const memberCountry = isEuParliament ? (EU_MEMBER_COUNTRY_BY_NAME[r.country] ?? null) : null;
      const gateCode = gateCodeByAllocationId.get(r.id)?.trim() ?? "";
      const partyKey = isEuParliament && !isChairSeat
        ? (EU_MEMBER_PARTY_BY_NAME[r.country] ?? parseEuParty(r.country) ?? parseEuParty(gateCode))
        : null;
      const countryDisplay = memberCountry ?? (isEuParliament ? stripTrailingEuParty(r.country) : r.country);
      const partyLabel =
        isChairSeat
          ? null
          : partyKey
          ? EU_PARTY_LABELS[partyKey]
          : isEuParliament && gateCode && !/^[A-Z]{2,4}-\d{2,4}$/.test(gateCode)
            ? gateCode
            : null;
      return {
        ...r,
        flag: flagEmojiForCountryName(countryDisplay),
        email: r.user_id ? (emailByUserId.get(r.user_id) ?? null) : null,
        name: r.user_id ? (profileById.get(r.user_id)?.name ?? null) : null,
        grade: r.user_id ? (profileById.get(r.user_id)?.grade ?? null) : null,
        notes: r.user_id ? (profileById.get(r.user_id)?.notes ?? null) : null,
        linked_role: r.user_id ? (profileById.get(r.user_id)?.role ?? null) : null,
        linked_name: r.user_id ? (profileById.get(r.user_id)?.name ?? null) : null,
        country_display: countryDisplay,
        party_label: partyLabel,
        member_country: memberCountry,
      };
    })
  );
  const { data: rawRequests } = await supabase
    .from("allocation_signup_requests")
    .select("id, requested_by, status, allocations(country), profiles(name, username)")
    .eq("conference_id", activeConf.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pendingRequests = (rawRequests ?? []) as SignupRequestRow[];

  return (
    <MunPageShell title={t("allocationMatrix")}>
      <p className="text-sm text-brand-muted mb-4 max-w-2xl">
        {tMatrix("intro")}
      </p>
      <p className="text-xs text-brand-muted mb-5">
        {translateConferenceHeadline(
          tTopics,
          tCommitteeLabels,
          [activeConf.name, activeConf.committee].filter(Boolean).join(" — "),
          locale
        )}
      </p>

      <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">{tMatrix("columns.allocation")}</th>
              <th className="px-3 py-2">{tMatrix("columns.flag")}</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">{tMatrix("columns.email")}</th>
              <th className="px-3 py-2">{tMatrix("columns.name")}</th>
              <th className="px-3 py-2">{tMatrix("columns.grade")}</th>
              <th className="px-3 py-2">{tMatrix("columns.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-brand-muted">
                  {tMatrix("noRows")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy">{r.country}</td>
                  <td className="px-3 py-2 text-base">{r.flag}</td>
                  <td className="px-3 py-2 text-xs text-brand-muted">{r.party_label || tMatrix("dash")}</td>
                  <td className="px-3 py-2 text-xs text-brand-muted">{r.email || tMatrix("dash")}</td>
                  <td className="px-3 py-2 text-xs text-brand-muted">{r.name || tMatrix("dash")}</td>
                  <td className="px-3 py-2 text-xs text-brand-muted">{r.grade || tMatrix("dash")}</td>
                  <td className="px-3 py-2 text-xs text-brand-muted max-w-[280px]">
                    {r.notes?.trim() || tMatrix("dash")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ChairDelegateApprovalByEmailForm
        conferenceId={activeConf.id}
        allocationOptions={rows.map((r) => ({ id: r.id, country: r.country, user_id: r.user_id }))}
      />

      <section className="mt-6 rounded-lg border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-brand-navy">
          {tMatrix("pendingApprovalsTitle")}
        </h2>
        <p className="text-xs text-brand-muted mt-1 mb-3">
          {tMatrix("pendingApprovalsIntro")}
        </p>
        <ChairAllocationAutoRefresh />
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">{tMatrix("columns.requestedAllocation")}</th>
                <th className="px-3 py-2">{tMatrix("columns.account")}</th>
                <th className="px-3 py-2 w-[180px]">{tMatrix("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-brand-muted">
                    {tMatrix("noPendingRequests")}
                  </td>
                </tr>
              ) : (
                pendingRequests.map((req) => {
                  const alloc = firstEmbed(req.allocations);
                  const requester = firstEmbed(req.profiles);
                  const requesterLabel =
                    requester?.name?.trim() ||
                    requester?.username?.trim() ||
                    req.requested_by.slice(0, 8);
                  return (
                    <tr key={req.id} className="border-t border-brand-navy/5">
                      <td className="px-3 py-2 font-medium text-brand-navy">
                        {alloc?.country || tMatrix("unknownAllocation")}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">{requesterLabel}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveAllocationSignupRequestAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <button
                              type="submit"
                              className="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium hover:opacity-90"
                            >
                              {tMatrix("approve")}
                            </button>
                          </form>
                          <form action={rejectAllocationSignupRequestAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <button
                              type="submit"
                              className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 font-medium hover:bg-red-50"
                            >
                              {tMatrix("reject")}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </MunPageShell>
  );
}
