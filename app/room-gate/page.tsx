import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { RoomGateForm } from "./RoomGateForm";
import { SwitchCommitteeButton } from "./SwitchCommitteeButton";
import { SwitchConferenceButton } from "./SwitchConferenceButton";
import { AutoJoinSingleton } from "./AutoJoinSingleton";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { getActiveEventId } from "@/lib/active-event-cookie";
import { staffContinueWithLatestConference } from "@/app/actions/roomGate";
import {
  canCreateConferenceEvent,
  canUseLatestCommitteeShortcut,
  isStaffRole,
} from "@/lib/roles";
import { SMT_COMMITTEE_CODE } from "@/lib/join-codes";

export default async function RoomGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next: nextRaw, e: errCode } = await searchParams;
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

  const role = profile?.role;
  const showStaffTools = isStaffRole(role);
  const showLatestShortcut = canUseLatestCommitteeShortcut(role);
  const showConferenceSetup = canCreateConferenceEvent(role);

  const { count: eventCount } = await supabase
    .from("conference_events")
    .select("*", { count: "exact", head: true });
  const { count: conferenceCount } = await supabase
    .from("conferences")
    .select("*", { count: "exact", head: true });

  if ((eventCount ?? 0) === 1 && (conferenceCount ?? 0) === 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
        <div className="relative w-full max-w-md space-y-8">
          <BrandWordmark />
          <AutoJoinSingleton nextPath={nextPath} />
        </div>
      </div>
    );
  }

  if (!(await getActiveEventId())) {
    redirect(`/event-gate?next=${encodeURIComponent(nextPath)}`);
  }

  const existing = await getResolvedActiveConference();
  if (existing?.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
        <div className="relative w-full max-w-md space-y-8">
          <BrandWordmark />
          <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10 space-y-4">
            <h1 className="font-display text-xl font-semibold text-brand-navy text-center">
              Already in a committee
            </h1>
            <p className="text-sm text-brand-muted text-center">
              You are set to{" "}
              <strong className="text-brand-navy">
                {[existing.name, existing.committee, existing.tagline].filter(Boolean).join(" — ")}
              </strong>
              .
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={nextPath}
                className="block text-center py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft"
              >
                Continue to platform
              </Link>
              <SwitchCommitteeButton nextPath={nextPath} />
              <SwitchConferenceButton nextPath={nextPath} />
              {showConferenceSetup ? (
                <Link
                  href={`/conference-setup?next=${encodeURIComponent(nextPath)}`}
                  className="block text-center text-sm text-brand-navy font-medium border border-brand-navy/20 rounded-lg py-2.5 hover:bg-brand-cream/60"
                >
                  Set up a new conference (SMT)
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="block text-center text-sm text-brand-accent hover:underline py-2"
              >
                Go to profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const staffErrMsg =
    errCode === "no-conferences"
      ? "There are no conferences yet. SMT can set up a new conference below, or add rows in Supabase / run seed.sql."
      : errCode === "not-staff"
        ? "That shortcut is not available for your role."
      : errCode === "latest-smt-only"
        ? "Opening the latest committee without codes is for SMT (secretariat) only. Dais chairs should enter the conference code and committee code."
        : errCode === "create-forbidden"
          ? "Only SMT (secretariat) can create a new conference event. Join with your codes or ask SMT."
          : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,148,30,0.08),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Join your committee
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Enter your <strong>committee code</strong> for this conference. You should already have
            entered the <strong>conference code</strong> on the previous screen.
          </p>
          <p className="text-xs text-brand-muted text-center mb-4">
            <Link href={`/event-gate?next=${encodeURIComponent(nextPath)}`} className="text-brand-accent hover:underline">
              Wrong conference? Enter a different conference code
            </Link>
          </p>
          {staffErrMsg && (
            <p
              className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4"
              role="alert"
            >
              {staffErrMsg}
            </p>
          )}
          {showLatestShortcut && (
            <form action={staffContinueWithLatestConference} className="mb-4">
              <input type="hidden" name="next" value={nextPath} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg border-2 border-brand-accent text-brand-navy font-medium hover:bg-brand-cream/80 transition-colors"
              >
                SMT: open latest committee (skip codes)
              </button>
              <p className="text-xs text-brand-muted text-center mt-2">
                Opens the <strong className="text-brand-navy">{SMT_COMMITTEE_CODE}</strong> session when
                it exists (after conference code <strong className="text-brand-navy">SEAMUNI2027</strong>
                ). Dais chairs must enter their committee codes above.
              </p>
            </form>
          )}
          {showConferenceSetup && (
            <div className="mb-6 rounded-xl border border-brand-navy/15 bg-brand-cream/50 p-4">
              <Link
                href={`/conference-setup?next=${encodeURIComponent(nextPath)}`}
                className="block text-center text-sm font-semibold text-brand-navy hover:text-brand-accent transition-colors"
              >
                Set up a new conference (SMT only)
              </Link>
              <p className="text-xs text-brand-muted text-center mt-2 leading-relaxed">
                Creates the conference code and the first committee code. Chairs manage committee
                codes from Chair → Committee code after SMT creates the event.
              </p>
            </div>
          )}
          <RoomGateForm nextPath={nextPath} showStaffTools={showStaffTools} />
        </div>
      </div>
    </div>
  );
}
