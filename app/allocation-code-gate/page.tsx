import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { translateConferenceHeadline } from "@/lib/i18n/conference-headline";
import { BrandWordmark } from "@/components/BrandWordmark";
import { resolveDashboardConferenceForUser } from "@/lib/active-conference";
import { getSmtDashboardSurface } from "@/lib/smt-dashboard-surface-cookie";
import { getAllocationCodeVerifiedConferenceId } from "@/lib/allocation-code-gate-cookie";
import { sortCountryLabelsForDisplay } from "@/lib/allocation-display-order";
import { AllocationCodeGateForm } from "./AllocationCodeGateForm";

export default async function AllocationCodeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("allocationCodeGate");
  const tc = await getTranslations("common");
  const tTopics = await getTranslations("agendaTopics");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const locale = await getLocale();
  const { next: nextRaw } = await searchParams;
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/delegate";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toString().toLowerCase();
  const smtSurface = role === "smt" ? await getSmtDashboardSurface() : null;
  if (role !== "delegate" && role !== "chair" && !(role === "smt" && smtSurface === "delegate")) {
    redirect(nextPath);
  }

  const activeCtx = await resolveDashboardConferenceForUser(profile?.role, user.id);
  if (!activeCtx?.id) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee, tagline, allocation_code_gate_enabled")
    .eq("id", activeCtx.id)
    .maybeSingle();

  if (!conference) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  if (!conference.allocation_code_gate_enabled) {
    redirect(nextPath);
  }

  const verified = await getAllocationCodeVerifiedConferenceId();
  if (verified === conference.id) {
    redirect(nextPath);
  }

  const { data: allocs } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conference.id)
    .eq("user_id", user.id);

  const countries = sortCountryLabelsForDisplay([
    ...new Set(
      (allocs ?? [])
        .map((a) => a.country?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ]);
  let pendingSeatCountry: string | null = null;
  if (countries.length === 0) {
    const { data: pendingReq } = await supabase
      .from("allocation_signup_requests")
      .select("status, allocation:allocations(country)")
      .eq("conference_id", conference.id)
      .eq("requested_by", user.id)
      .eq("status", "pending")
      .maybeSingle();
    const rawCountry = pendingReq?.allocation;
    if (rawCountry && typeof rawCountry === "object" && "country" in rawCountry) {
      const c = String(rawCountry.country ?? "").trim();
      pendingSeatCountry = c || null;
    }
  }

  const titleRaw = [conference.name, conference.committee, conference.tagline].filter(Boolean).join(" — ");
  const title = translateConferenceHeadline(tTopics, tCommitteeLabels, titleRaw, locale);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">{t("title")}</h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            {t.rich("description", {
              seat: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>

          {countries.length === 0 ? (
            <div className="space-y-4 text-sm text-brand-muted">
              <p>{t("noAllocation")}</p>
              {pendingSeatCountry ? (
                <p className="rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-3 text-xs text-brand-navy/90">
                  Your seat request for <strong>{pendingSeatCountry}</strong> is still pending chair approval. The
                  seat sign-in code input appears automatically once your seat is assigned.
                </p>
              ) : (
                <p className="rounded-lg border border-brand-navy/10 bg-brand-cream/40 p-3 text-xs text-brand-navy/90">
                  This screen only shows the seat sign-in code input after your account is assigned to a seat in this
                  committee.
                </p>
              )}
              <Link href="/profile" className="inline-block text-brand-accent font-medium hover:underline">
                Go to profile
              </Link>
              <Link href="/room-gate" className="inline-block text-brand-accent font-medium hover:underline">
                {t("changeRoomCode")}
              </Link>
            </div>
          ) : (
            <AllocationCodeGateForm
              conferenceId={conference.id}
              conferenceTitle={title || tc("conference")}
              seatLabel={countries.join(", ")}
              nextPath={nextPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
