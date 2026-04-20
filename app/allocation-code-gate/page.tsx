import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { getConferenceForDashboard } from "@/lib/active-conference";
import { getAllocationCodeVerifiedConferenceId } from "@/lib/allocation-code-gate-cookie";
import { sortCountryLabelsForDisplay } from "@/lib/allocation-display-order";
import { AllocationCodeGateForm } from "./AllocationCodeGateForm";

export default async function AllocationCodeGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
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
  if (role !== "delegate" && role !== "chair") {
    redirect(nextPath);
  }

  const activeCtx = await getConferenceForDashboard({ role: profile?.role });
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

  const title = [conference.name, conference.committee, conference.tagline].filter(Boolean).join(" — ");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-brand-cream">
      <div className="relative w-full max-w-md space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10">
          <div className="h-1 w-16 rounded-full bg-brand-accent mx-auto mb-6" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-brand-navy text-center mb-2">
            Seat sign-in code
          </h1>
          <p className="text-sm text-brand-muted text-center mb-6">
            Third step after the conference and committee gates: enter the <strong>placard code</strong> for your
            seat (same list chairs use for materials).
          </p>

          {countries.length === 0 ? (
            <div className="space-y-4 text-sm text-brand-muted">
              <p>You do not have an allocation for this committee yet. Ask SMT to assign your seat first.</p>
              <Link href="/room-gate" className="inline-block text-brand-accent font-medium hover:underline">
                Change room code
              </Link>
            </div>
          ) : (
            <AllocationCodeGateForm
              conferenceId={conference.id}
              conferenceTitle={title || "Conference"}
              seatLabel={countries.join(", ")}
              nextPath={nextPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
