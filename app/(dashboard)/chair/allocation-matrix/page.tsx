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
import { getTranslations } from "next-intl/server";

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

export default async function ChairAllocationMatrixPage() {
  const t = await getTranslations("pageTitles");
  const tMatrix = await getTranslations("chairAllocationMatrixPage");
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
    "flag" | "email" | "name" | "grade" | "notes" | "linked_role" | "linked_name"
  >[];
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
  const rows: AllocationRow[] = sortRowsByAllocationCountry(
    rawRows.map((r) => ({
      ...r,
      flag: flagEmojiForCountryName(r.country),
      email: r.user_id ? (emailByUserId.get(r.user_id) ?? null) : null,
      name: r.user_id ? (profileById.get(r.user_id)?.name ?? null) : null,
      grade: r.user_id ? (profileById.get(r.user_id)?.grade ?? null) : null,
      notes: r.user_id ? (profileById.get(r.user_id)?.notes ?? null) : null,
      linked_role: r.user_id ? (profileById.get(r.user_id)?.role ?? null) : null,
      linked_name: r.user_id ? (profileById.get(r.user_id)?.name ?? null) : null,
    }))
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
        {[activeConf.name, activeConf.committee].filter(Boolean).join(` ${tMatrix("separator")} `)}
      </p>

      <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">{tMatrix("columns.allocation")}</th>
              <th className="px-3 py-2">{tMatrix("columns.flag")}</th>
              <th className="px-3 py-2">{tMatrix("columns.email")}</th>
              <th className="px-3 py-2">{tMatrix("columns.name")}</th>
              <th className="px-3 py-2">{tMatrix("columns.grade")}</th>
              <th className="px-3 py-2">{tMatrix("columns.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-brand-muted">
                  {tMatrix("noRows")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy">{r.country}</td>
                  <td className="px-3 py-2 text-base">{r.flag}</td>
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
