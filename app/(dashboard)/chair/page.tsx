import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairHowToAccordion } from "@/components/chair/ChairHowToAccordion";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { ChairTopicTabsCard } from "@/components/chair/ChairTopicTabsCard";
import { getTranslations } from "next-intl/server";
import {
  translateAgendaTopicLabel,
  translateCommitteeLabel,
} from "@/lib/i18n/committee-topic-labels";

export default async function ChairOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await getTranslations("pageTitles");
  const td = await getTranslations("chairNav");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const tTopics = await getTranslations("agendaTopics");
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
  const debateBundle = await getResolvedDebateConferenceBundle(supabase, conferenceId);
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, tagline, name")
    .eq("id", conferenceId)
    .maybeSingle();
  const committeeLabel = conf?.committee?.trim()
    ? translateCommitteeLabel(tCommitteeLabels, conf.committee)
    : conf?.name?.trim()
      ? translateAgendaTopicLabel(tTopics, conf.name)
      : "your committee";
  const translatedCommittee = conf?.committee?.trim()
    ? translateCommitteeLabel(tCommitteeLabels, conf.committee)
    : null;
  const translatedTopic = conf?.name?.trim() ? translateAgendaTopicLabel(tTopics, conf.name) : null;
  const line = [translatedCommittee, conf?.tagline].filter(Boolean).join(" · ") || translatedTopic || "Committee";
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
    { href: "/chair/session/discipline", label: "Disciplinary", hint: "Warnings, strikes, and rights restrictions" },
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
    { href: "/committee-room", label: "Committee room (full)", hint: "Virtual layout & delegate floor" },
  ];
  const { tab } = await searchParams;
  const tabs = [
    { id: "overview", label: td("dashboardTabs.overview") },
    { id: "guidance", label: td("dashboardTabs.guidance") },
    { id: "jump", label: td("dashboardTabs.jump") },
  ] as const;
  const activeTab = tab === "guidance" || tab === "jump" ? tab : "overview";

  return (
    <MunPageShell title={t("chairRoom")}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="font-display text-[1.85rem] font-semibold text-brand-navy">
            Welcome, Chair of {committeeLabel}
          </h1>
          <p className="text-base font-medium text-brand-navy dark:text-zinc-100">
            🖥️ Digital Room · 📜 Motions · 🗳️ Voting · 🎤 Speakers
          </p>
          <p className="text-sm text-brand-muted dark:text-zinc-400">
            Active committee: <span className="font-semibold text-brand-navy dark:text-zinc-100">{line}</span>. Session
            data syncs through your account; prep/flow checklists and Motions & Points are saved in this browser
            for this committee — same idea as{" "}
            <a
              href="https://thedashboard.seamuns.site/chair"
              className="font-medium text-brand-diplomatic underline decoration-brand-diplomatic/35 underline-offset-2 dark:text-brand-accent-bright"
              target="_blank"
              rel="noopener noreferrer"
            >
              SEAMUNs Chair Room
            </a>
            .
          </p>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label={td("dashboardTabs.ariaLabel")}>
          {tabs.map((tabItem) => (
            <Link
              href={tabItem.id === "overview" ? "/chair" : `/chair?tab=${tabItem.id}`}
              key={tabItem.id}
              role="tab"
              aria-selected={activeTab === tabItem.id}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tabItem.id
                  ? "border-brand-accent text-brand-navy bg-brand-paper"
                  : "border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40"
              }`}
            >
              {tabItem.label}
            </Link>
          ))}
        </div>
        {activeTab === "overview" ? (
          <ChairTopicTabsCard topics={debateBundle.debateTopicOptions} activeTopicId={debateBundle.debateConferenceId} />
        ) : null}
        {activeTab === "guidance" ? (
          <>
            <ChairHowToAccordion />
            <RoleSetupChecklist role="chair" />
          </>
        ) : null}
        {activeTab === "jump" ? (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-zinc-400">{td("dashboardTabs.jump")}</h3>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {tiles.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="block rounded-lg border border-brand-navy/10 bg-white px-3.5 py-2.5 shadow-sm transition hover:border-brand-accent/45 hover:bg-brand-accent/8 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-brand-accent/40 dark:hover:bg-brand-accent/12"
                >
                  <span className="font-semibold text-brand-navy dark:text-zinc-50">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-brand-muted dark:text-zinc-400">{t.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        ) : null}
      </div>
    </MunPageShell>
  );
}
