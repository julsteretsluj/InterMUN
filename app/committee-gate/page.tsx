import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CommitteeGateForm } from "./CommitteeGateForm";
import { StaffNotDelegateBypassForm } from "./StaffNotDelegateBypassForm";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";
import { getConferenceForDashboard } from "@/lib/active-conference";

export default async function CommitteeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/profile";

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

  const activeCtx = await getConferenceForDashboard({ role: profile?.role });
  if (!activeCtx?.id) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee, tagline, committee_password_hash")
    .eq("id", activeCtx.id)
    .maybeSingle();

  if (!conference) {
    redirect(`/room-gate?next=${encodeURIComponent(nextPath)}`);
  }

  if (!conference.committee_password_hash) {
    redirect(nextPath);
  }

  const verified = await getVerifiedConferenceId();
  if (verified === conference.id) {
    redirect(nextPath);
  }

  const { data: allocs } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conference.id)
    .eq("user_id", user.id);

  const allocationChoices = [
    ...new Set(
      (allocs ?? [])
        .map((a) => a.country?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ];

  const title = [conference.name, conference.committee, conference.tagline].filter(Boolean).join(" — ");
  const staffBypass = profile?.role === "smt" || profile?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,148,30,0.08),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-gold mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Committee sign-in
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            After your account login, confirm your <strong>allocation</strong> and enter the{" "}
            <strong>committee password</strong> from your chair.
          </p>

          {allocationChoices.length === 0 ? (
            <div className="space-y-5 text-sm text-brand-muted">
              <p>
                You do not have an allocation for this committee yet. Ask SMT to assign you in
                the matrix before you can continue.
              </p>
              {staffBypass ? (
                <StaffNotDelegateBypassForm conferenceId={conference.id} nextPath={nextPath} />
              ) : profile?.role === "chair" ? (
                <p className="text-xs border border-brand-navy/10 rounded-lg p-3 bg-brand-cream/40">
                  <strong>Dais chairs</strong> need a committee allocation from secretariat. After SMT
                  adds your seat, reload and sign in with your allocation and the committee password.
                </p>
              ) : null}
              <Link
                href="/room-gate"
                className="inline-block text-brand-gold font-medium hover:underline"
              >
                Change room code
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <CommitteeGateForm
                conferenceId={conference.id}
                conferenceTitle={title || "Conference"}
                allocationChoices={allocationChoices}
                nextPath={nextPath}
              />
              {staffBypass ? (
                <>
                  <p className="text-center text-xs text-brand-muted">or</p>
                  <StaffNotDelegateBypassForm conferenceId={conference.id} nextPath={nextPath} />
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
