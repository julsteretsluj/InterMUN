import { createClient } from "@/lib/supabase/server";
import { getActiveEventId } from "@/lib/active-event-cookie";
import {
  approveAllocationSignupRequestAction,
  rejectAllocationSignupRequestAction,
} from "@/app/actions/allocationSignup";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("adminStatusPortal");
  const eventId = await getActiveEventId();
  if (!eventId) {
    return (
      <section className="mun-shell !shadow-none space-y-2">
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h2>
        <p className="text-sm text-brand-muted">{t("selectEventFirst")}</p>
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
        <h2 className="font-display text-lg font-semibold text-brand-navy">{t("title")}</h2>
        <p className="text-sm text-brand-muted">{t("noSessionsYet")}</p>
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
          <h2 className="font-display text-lg font-semibold text-brand-navy">{t("titlePipeline")}</h2>
          <p className="text-sm text-brand-muted">
            {t.rich("intro", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <div className="text-sm text-brand-muted">
          {t("pending")}: <span className="font-semibold text-brand-navy">{pendingRequests.length}</span>
          {" · "}
          {t("confirmed")}: <span className="font-semibold text-brand-navy">{approvedRequests.length}</span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[320px] flex-1 rounded-lg border border-brand-navy/10 bg-brand-paper p-4">
          <h3 className="font-display text-sm font-semibold text-brand-navy mb-3">{t("pending")}</h3>
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-brand-muted">{t("nothingPending")}</p>
            ) : (
              pendingRequests.map((req) => {
                const alloc = firstEmbed(req.allocations);
                const requester = firstEmbed(req.profiles);
                const requesterLabel =
                  requester?.name?.trim() || requester?.username?.trim() || req.requested_by.slice(0, 8);
                const allocLabel = alloc?.country?.trim() || t("unknownAllocation");
                return (
                  <div key={req.id} className="rounded-lg border border-brand-navy/10 bg-white/50 p-3">
                    <div className="text-sm font-semibold text-brand-navy">{allocLabel}</div>
                    <div className="text-xs text-brand-muted mt-1">
                      {t("requester")} {requesterLabel}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <form action={approveAllocationSignupRequestAction}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded bg-brand-accent text-white font-medium hover:opacity-90"
                        >
                          {t("confirm")}
                        </button>
                      </form>
                      <form action={rejectAllocationSignupRequestAction}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 font-medium hover:bg-red-50"
                        >
                          {t("reject")}
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
          <h3 className="font-display text-sm font-semibold text-brand-navy mb-3">{t("confirmed")}</h3>
          <div className="space-y-3">
            {approvedRequests.length === 0 ? (
              <p className="text-sm text-brand-muted">{t("noConfirmedYet")}</p>
            ) : (
              approvedRequests.map((req) => {
                const alloc = firstEmbed(req.allocations);
                const requester = firstEmbed(req.profiles);
                const requesterLabel =
                  requester?.name?.trim() || requester?.username?.trim() || req.requested_by.slice(0, 8);
                const allocLabel = alloc?.country?.trim() || t("unknownAllocation");
                return (
                  <div key={req.id} className="rounded-lg border border-brand-accent/25 bg-brand-accent/9 p-3">
                    <div className="text-sm font-semibold text-brand-navy">{allocLabel}</div>
                    <div className="text-xs text-brand-muted mt-1">
                      {t("requester")} {requesterLabel}
                    </div>
                    <div className="text-[0.68rem] text-brand-navy/85 mt-2 font-medium">
                      {t("delegateProvisioned")}
                    </div>
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

