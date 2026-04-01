import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { DelegateCountdownCard } from "@/components/delegate/DelegateCountdownCard";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";

export default async function DelegateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("country")
    .eq("id", user.id)
    .maybeSingle();

  const conferenceId = await requireActiveConferenceId();
  const { data: myAllocation } = await supabase
    .from("allocations")
    .select("country")
    .eq("conference_id", conferenceId)
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, tagline, name")
    .eq("id", conferenceId)
    .maybeSingle();
  const line = [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || "Committee";
  const countryLabel = myAllocation?.country?.trim() || profile?.country?.trim() || "your country";
  const countryFlag = flagEmojiForCountryName(countryLabel);
  const crisisReportingEnabled = isCrisisCommittee(conf?.committee ?? null);

  const tiles: { href: string; label: string; hint: string }[] = [
    { href: "/stances", label: "Country & stance", hint: "Your position and prep" },
    { href: "/delegate#countdown", label: "Countdown", hint: "Committee-wide deadlines" },
    { href: "/committee-room", label: "Committee matrix", hint: "Seats and committee room" },
    { href: "/speeches", label: "Prep & speeches", hint: "Speech drafts and floor prep" },
    { href: "/sources", label: "Trusted sources", hint: "Research links and nation sources" },
    { href: "/guides", label: "Guides & resources", hint: "How-to and chair-facing references" },
    { href: "/running-notes", label: "Checklist & running notes", hint: "Session scratch pad" },
    { href: "/official-links", label: "Official UN links", hint: "Documents, bodies, programmes" },
    { href: "/voting", label: "Voting", hint: "When your chair opens a vote" },
    { href: "/documents", label: "Archive", hint: "Your documents" },
    ...(crisisReportingEnabled
      ? ([
          { href: "/crisis-slides", label: "Crisis slides", hint: "Live deck in the app" },
          { href: "/report", label: "Crisis / report", hint: "Raise an issue" },
        ] as const)
      : []),
  ];

  return (
    <MunPageShell title="Delegate dashboard">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-brand-navy">
            Welcome, Delegate of {countryFlag} {countryLabel}
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Active committee: <span className="font-semibold text-slate-900 dark:text-zinc-100">{line}</span>.
            Countdown dates are shared with everyone in this committee. Your prep, stances, and documents stay with
            your account.
          </p>
        </header>

        <DelegateCountdownCard conferenceId={conferenceId} />
        <RoleSetupChecklist role="delegate" />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Jump to
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tiles.map((t) => (
              <li key={t.href + t.label}>
                <Link
                  href={t.href}
                  className="block rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/30"
                >
                  <span className="font-semibold text-slate-900 dark:text-zinc-50">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">{t.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MunPageShell>
  );
}
