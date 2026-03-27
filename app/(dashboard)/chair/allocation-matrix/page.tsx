import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { getConferenceForDashboard } from "@/lib/active-conference";
import {
  approveAllocationSignupRequestAction,
  rejectAllocationSignupRequestAction,
} from "@/app/actions/allocationSignup";

type AllocationRow = {
  id: string;
  conference_id: string;
  country: string;
  user_id: string | null;
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

  const rows = (allocData ?? []) as AllocationRow[];
  const ids = rows.map((r) => r.id);

  const { data: codeRows } = ids.length
    ? await supabase
        .from("allocation_gate_codes")
        .select("allocation_id, code")
        .in("allocation_id", ids)
    : { data: [] as { allocation_id: string; code: string | null }[] };

  const codeById = new Map((codeRows ?? []).map((c) => [c.allocation_id, c.code ?? null]));

  const { data: rawRequests } = await supabase
    .from("allocation_signup_requests")
    .select("id, requested_by, status, allocations(country), profiles(name, username)")
    .eq("conference_id", activeConf.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const pendingRequests = (rawRequests ?? []) as SignupRequestRow[];

  return (
    <MunPageShell title="Allocation matrix">
      <p className="text-sm text-brand-muted mb-4 max-w-2xl">
        Committee allocation matrix for your current session. This is read-only for chairs and
        reflects active seat assignments and placard codes.
      </p>
      <p className="text-xs text-brand-muted mb-5">
        {[activeConf.name, activeConf.committee].filter(Boolean).join(" — ")}
      </p>

      <div className="overflow-x-auto rounded-lg border border-brand-navy/10 bg-brand-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
              <th className="px-3 py-2">Country / position</th>
              <th className="px-3 py-2">Placard code</th>
              <th className="px-3 py-2">Delegate</th>
              <th className="px-3 py-2">Sign-up link</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-muted">
                  No allocation rows found for this committee.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-brand-navy/5">
                  <td className="px-3 py-2 font-medium text-brand-navy">{r.country}</td>
                  <td className="px-3 py-2 font-mono text-xs text-brand-navy/90">
                    {codeById.get(r.id)?.trim() ? codeById.get(r.id) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-brand-muted">
                    {r.user_id ? "Linked" : "Open"}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`/allocation-signup?conference=${encodeURIComponent(activeConf.id)}&allocation=${encodeURIComponent(r.id)}&next=${encodeURIComponent("/profile")}`}
                      className="text-xs text-brand-gold hover:underline break-all"
                    >
                      Allocation sign-up link
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-6 rounded-lg border border-brand-navy/10 bg-brand-paper p-4 md:p-5">
        <h2 className="font-display text-lg font-semibold text-brand-navy">
          Pending sign-up approvals
        </h2>
        <p className="text-xs text-brand-muted mt-1 mb-3">
          Chairs approve or reject allocation link sign-ups to ensure delegates use the correct
          account.
        </p>
        <div className="overflow-x-auto rounded-lg border border-brand-navy/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/50 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="px-3 py-2">Requested allocation</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2 w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-brand-muted">
                    No pending requests.
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
                        {alloc?.country || "Unknown allocation"}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">{requesterLabel}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveAllocationSignupRequestAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <button
                              type="submit"
                              className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={rejectAllocationSignupRequestAction}>
                            <input type="hidden" name="request_id" value={req.id} />
                            <button
                              type="submit"
                              className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 font-medium hover:bg-red-50"
                            >
                              Reject
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
