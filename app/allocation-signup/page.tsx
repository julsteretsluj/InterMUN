import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveConferenceContext } from "@/lib/set-active-conference-context";
import { clearVerifiedConference } from "@/lib/committee-gate-cookie";
import { clearAllocationCodeVerification } from "@/lib/allocation-code-gate-cookie";
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
  const t = await getTranslations("allocationSignupPage");
  const tc = await getTranslations("common");
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
          <h1 className="font-display text-xl font-semibold">{t("invalidLinkTitle")}</h1>
          <p className="text-sm text-brand-muted">{t("invalidLinkBody")}</p>
          <Link href="/profile" className="text-sm text-brand-accent hover:underline">
            {tc("returnToProfile")}
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
          <h1 className="font-display text-xl font-semibold">{t("allocationNotFoundTitle")}</h1>
          <p className="text-sm text-brand-muted">{t("allocationNotFoundBody")}</p>
          <Link href="/profile" className="text-sm text-brand-accent hover:underline">
            {tc("returnToProfile")}
          </Link>
        </div>
      </div>
    );
  }

  if (targetAllocation.user_id && targetAllocation.user_id !== user.id) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">{t("allocationTakenTitle")}</h1>
          <p className="text-sm text-brand-muted">
            {t("allocationTakenBody", { country: targetAllocation.country })}
          </p>
          <Link href="/profile" className="text-sm text-brand-accent hover:underline">
            {tc("returnToProfile")}
          </Link>
        </div>
      </div>
    );
  }

  if (targetAllocation.user_id === user.id) {
    await setActiveConferenceContext(supabase, conferenceId);
    await clearVerifiedConference();
    await clearAllocationCodeVerification();
    redirect(
      `/committee-gate?next=${encodeURIComponent(nextPath)}&allocation=${encodeURIComponent(targetAllocation.country)}`
    );
  }

  const requestResult = await createAllocationSignupRequestAction(conferenceId, allocationId);
  if (requestResult.error) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
          <h1 className="font-display text-xl font-semibold">{t("submitFailedTitle")}</h1>
          <p className="text-sm text-brand-muted">{requestResult.error}</p>
          <Link href="/profile" className="text-sm text-brand-accent hover:underline">
            {tc("returnToProfile")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy flex items-center justify-center px-4">
      <div className="max-w-lg rounded-xl border border-brand-navy/10 bg-brand-paper p-6 space-y-3">
        <h1 className="font-display text-xl font-semibold">{t("requestSubmittedTitle")}</h1>
        <p className="text-sm text-brand-muted">
          {t("requestSubmittedBody", { country: targetAllocation.country })}
        </p>
        <p className="text-xs text-brand-muted">{t("requestSubmittedHint")}</p>
        <div className="pt-1">
          <Link
            href={`/committee-gate?next=${encodeURIComponent(nextPath)}&allocation=${encodeURIComponent(targetAllocation.country)}`}
            className="text-sm text-brand-accent hover:underline"
          >
            {t("continueCommitteeSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
