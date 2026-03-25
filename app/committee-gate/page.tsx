import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandWordmark } from "@/components/BrandWordmark";
import { CommitteeGateForm } from "./CommitteeGateForm";
import { getVerifiedConferenceId } from "@/lib/committee-gate-cookie";

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

  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee, committee_password_hash")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conference?.committee_password_hash) {
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

  const title = [conference.name, conference.committee].filter(Boolean).join(" — ");

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
            <div className="space-y-4 text-sm text-brand-muted">
              <p>
                You do not have an allocation for the active conference yet. Ask a chair or
                SMT member to assign you before you can continue.
              </p>
              <Link
                href={nextPath}
                className="inline-block text-brand-gold font-medium hover:underline"
              >
                ← Back
              </Link>
            </div>
          ) : (
            <CommitteeGateForm
              conferenceId={conference.id}
              conferenceTitle={title || "Conference"}
              allocationChoices={allocationChoices}
              nextPath={nextPath}
            />
          )}
        </div>
      </div>
    </div>
  );
}
