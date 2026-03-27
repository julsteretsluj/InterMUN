import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { createAllocationSignupRequestAction } from "@/app/actions/allocationSignup";

type Params = {
  conference?: string;
  allocation?: string;
  next?: string;
};

export default async function AllocationSignupPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { conference, allocation, next } = await searchParams;
  const conferenceId = String(conference ?? "").trim();
  const allocationId = String(allocation ?? "").trim();
  const nextPathRaw = String(next ?? "/profile").trim() || "/profile";
  const nextPath =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : "/profile";

  if (!conferenceId || !allocationId) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">Invalid sign-up link</h1>
          <p className="text-sm text-brand-muted">
            This allocation link is missing required details. Ask your chair or SMT for a fresh
            sign-up link.
          </p>
          <Link href="/profile" className="text-sm text-brand-gold hover:underline">
            Return to profile
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const backTo = `/allocation-signup?conference=${encodeURIComponent(conferenceId)}&allocation=${encodeURIComponent(allocationId)}&next=${encodeURIComponent(nextPath)}`;
    redirect(`/login?next=${encodeURIComponent(backTo)}`);
  }

  const { data: targetAllocation } = await supabase
    .from("allocations")
    .select("id, conference_id, country, user_id")
    .eq("id", allocationId)
    .eq("conference_id", conferenceId)
    .maybeSingle();

  if (!targetAllocation) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">Allocation not found</h1>
          <p className="text-sm text-brand-muted">
            This nation/position is no longer available in the selected committee.
          </p>
          <Link href="/profile" className="text-sm text-brand-gold hover:underline">
            Return to profile
          </Link>
        </div>
      </div>
    );
  }

  if (targetAllocation.user_id && targetAllocation.user_id !== user.id) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">Allocation already taken</h1>
          <p className="text-sm text-brand-muted">
            {targetAllocation.country} has already been claimed by another account. Please choose a
            different allocation.
          </p>
          <Link href="/profile" className="text-sm text-brand-gold hover:underline">
            Return to profile
          </Link>
        </div>
      </div>
    );
  }

  if (targetAllocation.user_id === user.id) {
    await setActiveConferenceContext(supabase, conferenceId);
    await clearVerifiedConference();
    redirect(
      `/committee-gate?next=${encodeURIComponent(nextPath)}&allocation=${encodeURIComponent(targetAllocation.country)}`
    );
  }

  const requestResult = await createAllocationSignupRequestAction(conferenceId, allocationId);
  if (requestResult.error) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">Could not submit request</h1>
          <p className="text-sm text-brand-muted">{requestResult.error}</p>
          <Link href="/profile" className="text-sm text-brand-gold hover:underline">
            Return to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
      <div className="max-w-lg rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
        <h1 className="font-display text-xl font-semibold">Sign-up request submitted</h1>
        <p className="text-sm text-brand-muted">
          Your request for <strong className="text-brand-navy">{targetAllocation.country}</strong> has
          been sent to the committee chair for approval.
        </p>
        <p className="text-xs text-brand-muted">
          Once approved, reopen this link or continue to committee sign-in to proceed.
        </p>
        <div className="pt-1">
          <Link
            href={`/committee-gate?next=${encodeURIComponent(nextPath)}&allocation=${encodeURIComponent(targetAllocation.country)}`}
            className="text-sm text-brand-gold hover:underline"
          >
            Continue to committee sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}
