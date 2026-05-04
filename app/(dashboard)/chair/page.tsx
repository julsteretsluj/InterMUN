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
import { getLocale, getTranslations } from "next-intl/server";
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
  const tPage = await getTranslations("chairOverviewPage");
  const td = await getTranslations("chairNav");
  const tCommitteeLabels = await getTranslations("committeeNames.labels");
  const tTopics = await getTranslations("agendaTopics");
  const locale = await getLocale();
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
      ? translateAgendaTopicLabel(tTopics, conf.name, locale)
      : tPage("fallbackYourCommittee");
  const translatedCommittee = conf?.committee?.trim()
    ? translateCommitteeLabel(tCommitteeLabels, conf.committee)
    : null;
  const translatedTopic = conf?.name?.trim()
    ? translateAgendaTopicLabel(tTopics, conf.name, locale)
    : null;
  const line =
    [translatedCommittee, conf?.tagline].filter(Boolean).join(" · ") ||
    translatedTopic ||
    tPage("fallbackCommittee");
  const crisisReportingEnabled = isCrisisCommittee(conf?.committee ?? null);

  const tiles: { href: string; label: string; hint: string }[] = [
    { href: "/chair/prep-checklist", label: tPage("tiles.prepChecklist.label"), hint: tPage("tiles.prepChecklist.hint") },
    { href: "/chair/session/agenda", label: tPage("tiles.agenda.label"), hint: tPage("tiles.agenda.hint") },
    { href: "/chair/flow-checklist", label: tPage("tiles.flowChecklist.label"), hint: tPage("tiles.flowChecklist.hint") },
    { href: "/chair/allocation-matrix", label: tPage("tiles.delegates.label"), hint: tPage("tiles.delegates.hint") },
    { href: "/chair/digital-room", label: tPage("tiles.digitalRoom.label"), hint: tPage("tiles.digitalRoom.hint") },
    { href: "/chair/session/roll-call", label: tPage("tiles.rollCall.label"), hint: tPage("tiles.rollCall.hint") },
    { href: "/chair/session", label: tPage("tiles.session.label"), hint: tPage("tiles.session.hint") },
    { href: "/chair/session/speakers", label: tPage("tiles.speakers.label"), hint: tPage("tiles.speakers.hint") },
    { href: "/chair/session/motions", label: tPage("tiles.formalMotions.label"), hint: tPage("tiles.formalMotions.hint") },
    { href: "/chair/session/discipline", label: tPage("tiles.disciplinary.label"), hint: tPage("tiles.disciplinary.hint") },
    { href: "/chair/session/timer", label: tPage("tiles.timer.label"), hint: tPage("tiles.timer.hint") },
    { href: "/chair/session/announcements", label: tPage("tiles.announcements.label"), hint: tPage("tiles.announcements.hint") },
    { href: "/voting", label: tPage("tiles.voting.label"), hint: tPage("tiles.voting.hint") },
    { href: "/chair/awards", label: tPage("tiles.score.label"), hint: tPage("tiles.score.hint") },
    ...(crisisReportingEnabled
      ? ([
          { href: "/report", label: tPage("tiles.crisis.label"), hint: tPage("tiles.crisis.hint") },
          { href: "/crisis-slides", label: tPage("tiles.crisisSlides.label"), hint: tPage("tiles.crisisSlides.hint") },
        ] as const)
      : []),
    { href: "/documents", label: tPage("tiles.archive.label"), hint: tPage("tiles.archive.hint") },
    { href: "/official-links", label: tPage("tiles.officialUnLinks.label"), hint: tPage("tiles.officialUnLinks.hint") },
    { href: "/chair/room-code", label: tPage("tiles.roomCode.label"), hint: tPage("tiles.roomCode.hint") },
    { href: "/committee-room", label: tPage("tiles.committeeRoomFull.label"), hint: tPage("tiles.committeeRoomFull.hint") },
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
            {tPage("welcome", { committee: committeeLabel })}
          </h1>
          <p className="text-base font-medium text-brand-navy dark:text-zinc-100">
            {tPage("featureStrip")}
          </p>
          <p className="text-sm text-brand-muted dark:text-zinc-400">
            {tPage.rich("activeCommitteeLine", {
              line: () => <span className="font-semibold text-brand-navy dark:text-zinc-100">{line}</span>,
              seamuns: (chunks) => (
                <a
                  href="https://thedashboard.seamuns.site/chair"
                  className="font-medium text-brand-diplomatic underline decoration-brand-diplomatic/35 underline-offset-2 dark:text-brand-accent-bright"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </a>
              ),
            })}
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
          <ChairTopicTabsCard
            topics={debateBundle.debateTopicOptions}
            activeTopicId={debateBundle.debateConferenceId}
            committeeLabelRaw={debateBundle.committeeLabelRaw}
          />
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
