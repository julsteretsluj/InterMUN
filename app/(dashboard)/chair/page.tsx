import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairHowToAccordion } from "@/components/chair/ChairHowToAccordion";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";

export default async function ChairOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role?.toString().toLowerCase();
  if (role !== "chair" && role !== "smt" && role !== "admin") {
    redirect("/profile");
  }

  const conferenceId = await requireActiveConferenceId();
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, tagline, name")
    .eq("id", conferenceId)
    .maybeSingle();
  const committeeLabel = conf?.committee?.trim() || conf?.name?.trim() || "your committee";
  const line = [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || "Committee";
  const crisisReportingEnabled = isCrisisCommittee(conf?.committee ?? null);

  const tiles: { href: string; label: string; hint: string }[] = [
    { href: "/chair/prep-checklist", label: "Prep checklist", hint: "Before conference" },
    { href: "/chair/flow-checklist", label: "Flow checklist", hint: "During session" },
    { href: "/chair/allocation-matrix", label: "Delegates", hint: "Matrix & assignments" },
    { href: "/chair/digital-room", label: "Digital Room", hint: "Placards, speaker list, roll status, chair notes (this device)" },
    { href: "/chair/session/roll-call", label: "Roll call", hint: "Attendance" },
    { href: "/chair/session", label: "Session", hint: "Start/stop committee session (timestamp)" },
    { href: "/chair/session/speakers", label: "Speakers", hint: "Same speaker list as Digital Room; syncs to committee room" },
    { href: "/chair/session/motions", label: "Formal motions", hint: "Motion floor & chair-recorded votes" },
    { href: "/chair/session/timer", label: "Timer", hint: "Floor clock, presets, pause log" },
    { href: "/chair/session/announcements", label: "Announcements", hint: "Dais lines, pin, schedule" },
    { href: "/chair/motions-points", label: "Motions & Points", hint: "Shared log & presets for your committee" },
    { href: "/voting", label: "Voting", hint: "Delegate vote display" },
    { href: "/chair/awards", label: "Score", hint: "Awards & nominations" },
    ...(crisisReportingEnabled
      ? ([
          { href: "/report", label: "Crisis", hint: "Incident reporting" },
          { href: "/crisis-slides", label: "Crisis slides", hint: "Embedded deck (SMT sets URL)" },
        ] as const)
      : []),
    { href: "/documents", label: "Archive", hint: "Committee documents" },
    { href: "/official-links", label: "Official UN links", hint: "Documents & bodies" },
    { href: "/chair/room-code", label: "Room code", hint: "Committee gate code" },
    { href: "/chair/allocation-passwords", label: "Sign-in passwords", hint: "Delegate passwords" },
    { href: "/committee-room", label: "Committee room (full)", hint: "Virtual layout & delegate floor" },
    { href: "/delegate", label: "Delegate dashboard", hint: "Same hub style as SEAMUNs delegate view" },
  ];

  return (
    <MunPageShell title="Chair room">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-brand-navy">
            Welcome, Chair of {committeeLabel}
          </h1>
          <p className="text-base font-medium text-slate-800 dark:text-zinc-100">
            🖥️ Digital Room · 📜 Motions · 🗳️ Voting · 🎤 Speakers
          </p>
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            Active committee: <span className="font-semibold text-slate-900 dark:text-zinc-100">{line}</span>. Session
            data syncs through your account; prep/flow checklists and Motions & Points are saved in this browser
            for this committee — same idea as{" "}
            <a
              href="https://thedashboard.seamuns.site/chair"
              className="font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2 dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              SEAMUNs Chair Room
            </a>
            .
          </p>
        </header>

        <ChairHowToAccordion />
        <RoleSetupChecklist role="chair" />

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Jump to
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {tiles.map((t) => (
              <li key={t.href}>
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
