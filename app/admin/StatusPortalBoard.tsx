import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  approveAllocationSignupRequestAction,
  rejectAllocationSignupRequestAction,
} from "@/app/actions/allocationSignup";

type SignupRequestRow = {
  id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  allocations: { country: string } | { country: string }[] | null;
  profiles: { name: string | null; username: string | null } | { name: string | null; username: string | null }[] | null;
};

function firstEmbed<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function StatusPortalBoard() {
  const eventId = await getActiveEventId();
  if (!eventId) {
    return (
      <section className="mun-shell !shadow-none space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Status portal</h2>
        <p className="text-sm text-brand-muted">Select an active event first.</p>
      </section>
    );
  }

  const supabase = await createClient();

  const { data: conferenceRows } = await supabase
    .from("conferences")
    .select("id")
    .eq("event_id", eventId);

  const confIds = (conferenceRows ?? []).map((c) => c.id).filter((id): id is string => Boolean(id));

  if (confIds.length === 0) {
    return (
      <section className="mun-shell !shadow-none space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">Status portal</h2>
        <p className="text-sm text-brand-muted">No committee sessions found for this event yet.</p>
      </section>
    );
  }

  const [{ data: pendingRaw }, { data: approvedRaw }] = await Promise.all([
    supabase
      .from("allocation_signup_requests")
      .select("id, requested_by, status, allocations(country), profiles(name, username)")
      .in("conference_id", confIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("allocation_signup_requests")
      .select("id, requested_by, status, allocations(country), profiles(name, username)")
      .in("conference_id", confIds)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  const pendingRequests = (pendingRaw ?? []) as SignupRequestRow[];
  const approvedRequests = (approvedRaw ?? []) as SignupRequestRow[];

  return (
    <section className="mun-shell !shadow-none space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold text-brand-navy">Status portal (Pipeline)</h2>
          <p className="text-sm text-brand-muted">
            Delegates move from <strong>Pending</strong> to <strong>Confirmed</strong> after approval.
            Confirming provisions them as a delegate and triggers the Welcome email.
          </p>
        </div>
        <div className="text-sm text-brand-muted">
          Pending: <span className="font-semibold text-brand-navy">{pendingRequests.length}</span> · Confirmed:{" "}
          <span className="font-semibold text-brand-navy">{approvedRequests.length}</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[320px] flex-1 rounded-lg border border-brand-navy/10 bg-brand-paper p-4">
          <h3 className="font-display text-sm font-semibold text-brand-navy mb-3">Pending</h3>
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-brand-muted">Nothing pending.</p>
            ) : (
              pendingRequests.map((req) => {
                const alloc = firstEmbed(req.allocations);
                const requester = firstEmbed(req.profiles);
                const requesterLabel =
                  requester?.name?.trim() || requester?.username?.trim() || req.requested_by.slice(0, 8);
                const allocLabel = alloc?.country?.trim() || "Unknown allocation";
                return (
                  <div key={req.id} className="rounded-lg border border-brand-navy/10 bg-white/50 p-3">
                    <div className="text-sm font-semibold text-brand-navy">{allocLabel}</div>
                    <div className="text-xs text-brand-muted mt-1">Requester: {requesterLabel}</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <form action={approveAllocationSignupRequestAction}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                        >
                          Confirm
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
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="min-w-[320px] flex-1 rounded-lg border border-brand-navy/10 bg-brand-paper p-4">
          <h3 className="font-display text-sm font-semibold text-brand-navy mb-3">Confirmed</h3>
          <div className="space-y-3">
            {approvedRequests.length === 0 ? (
              <p className="text-sm text-brand-muted">No confirmed requests yet.</p>
            ) : (
              approvedRequests.map((req) => {
                const alloc = firstEmbed(req.allocations);
                const requester = firstEmbed(req.profiles);
                const requesterLabel =
                  requester?.name?.trim() || requester?.username?.trim() || req.requested_by.slice(0, 8);
                const allocLabel = alloc?.country?.trim() || "Unknown allocation";
                return (
                  <div key={req.id} className="rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3">
                    <div className="text-sm font-semibold text-brand-navy">{allocLabel}</div>
                    <div className="text-xs text-brand-muted mt-1">Requester: {requesterLabel}</div>
                    <div className="text-[0.68rem] text-emerald-900/80 mt-2 font-medium">Delegate provisioned</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

