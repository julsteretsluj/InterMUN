import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { RoomGateForm } from "./RoomGateForm";
import { SwitchCommitteeButton } from "./SwitchCommitteeButton";
import { getResolvedActiveConference } from "@/lib/active-conference";
import { staffContinueWithLatestConference } from "@/app/actions/roomGate";

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

  const showChairSetupLink =
    profile?.role === "chair" || profile?.role === "smt";

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
                {[existing.name, existing.committee].filter(Boolean).join(" — ")}
              </strong>
              .
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={nextPath}
                className="block text-center py-3 rounded-lg bg-brand-navy text-brand-paper font-medium hover:bg-brand-navy-soft"
              >
                Continue to platform
              </Link>
              <SwitchCommitteeButton />
              <Link
                href="/profile"
                className="block text-center text-sm text-brand-gold hover:underline py-2"
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
      ? "There are no conferences in the database yet. Add one in Supabase (Table editor → conferences) or run seed.sql, then try again."
      : errCode === "not-staff"
        ? "Only chairs and SMT can use the staff shortcut."
        : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,148,30,0.08),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-gold mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Join your committee
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Enter the <strong>room code</strong> your chair shared. This selects which committee
            session you are in for the rest of the platform.
          </p>
          {staffErrMsg && (
            <p
              className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4"
              role="alert"
            >
              {staffErrMsg}
            </p>
          )}
          {showChairSetupLink && (
            <form action={staffContinueWithLatestConference} className="mb-6">
              <input type="hidden" name="next" value={nextPath} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg border-2 border-brand-gold text-brand-navy font-medium hover:bg-brand-cream/80 transition-colors"
              >
                Continue as chair / SMT (skip room code)
              </button>
              <p className="text-xs text-brand-muted text-center mt-2">
                Opens the latest conference in the database. Use a room code if you need a specific
                committee.
              </p>
            </form>
          )}
          <RoomGateForm nextPath={nextPath} showChairSetupLink={showChairSetupLink} />
        </div>
      </div>
    </div>
  );
}
