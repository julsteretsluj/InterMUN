import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairHowToAccordion } from "@/components/chair/ChairHowToAccordion";
import { ChairHubComposition } from "@/components/chair/ChairHubComposition";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { getResolvedDebateConferenceBundle } from "@/lib/active-debate-topic";
import { HubTileLink } from "@/components/HubTileLink";
import { ChairTopicTabsCard } from "@/components/chair/ChairTopicTabsCard";
import { MilestonesSummaryCard } from "@/components/milestones/MilestonesSummaryCard";
import { PriorityTabLink } from "@/components/PriorityTabLink";
import { getChamberScope } from "@/lib/chamber-scope";
import {
  CHAIR_DASHBOARD_TAB_ORDER,
  CHAIR_HUB_TILE_HREF_ORDER,
  hrefPriorityRank,
  sortByKeyPriority,
  withSequentialPriority,
} from "@/lib/nav-priority-order";
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
  const tc = await getTranslations("common");
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
  const scope = await getChamberScope(supabase, conferenceId);
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

  const canonicalId = debateBundle.canonicalConferenceId ?? conferenceId;
  const { data: procedure } = await supabase
    .from("procedure_states")
    .select("committee_session_started_at, committee_session_ends_at, committee_session_title")
    .eq("conference_id", canonicalId)
    .maybeSingle();
  const sessionStarted = Boolean(procedure?.committee_session_started_at);
  const sessionLive =
    sessionStarted &&
    (!procedure?.committee_session_ends_at ||
      new Date(procedure.committee_session_ends_at).getTime() > Date.now());
  const sessionStatus = sessionLive
    ? procedure?.committee_session_title?.trim()
      ? tPage("hub.sessionLiveNamed", { title: procedure.committee_session_title.trim() })
      : tPage("hub.sessionLive")
    : tPage("hub.sessionIdle");

  const { count: heldNotesCount } = await supabase
    .from("delegation_notes")
    .select("id", { count: "exact", head: true })
    .in("conference_id", scope.siblingConferenceIds)
    .eq("moderation_state", "held");

  const tilesRaw: { href: string; label: string; hint: string }[] = [
    { href: "/chair/prep-checklist", label: tPage("tiles.prepChecklist.label"), hint: tPage("tiles.prepChecklist.hint") },
    { href: "/chair/session/agenda", label: tPage("tiles.agenda.label"), hint: tPage("tiles.agenda.hint") },
    { href: "/chair/flow-checklist", label: tPage("tiles.flowChecklist.label"), hint: tPage("tiles.flowChecklist.hint") },
    { href: "/chair/allocation-matrix", label: tPage("tiles.delegates.label"), hint: tPage("tiles.delegates.hint") },
    { href: "/chair/digital-room", label: tPage("tiles.digitalRoom.label"), hint: tPage("tiles.digitalRoom.hint") },
    { href: "/chair/session/roll-call", label: tPage("tiles.rollCall.label"), hint: tPage("tiles.rollCall.hint") },
    { href: "/chair/session", label: tPage("tiles.session.label"), hint: tPage("tiles.session.hint") },
    { href: "/chair/session/speakers", label: tPage("tiles.speakers.label"), hint: tPage("tiles.speakers.hint") },
    { href: "/chair/session/opening-speech", label: tPage("tiles.openingSpeech.label"), hint: tPage("tiles.openingSpeech.hint") },
    { href: "/chair/session/motions", label: tPage("tiles.formalMotions.label"), hint: tPage("tiles.formalMotions.hint") },
    { href: "/chair/session/discipline", label: tPage("tiles.disciplinary.label"), hint: tPage("tiles.disciplinary.hint") },
    { href: "/chair/session/timer", label: tPage("tiles.timer.label"), hint: tPage("tiles.timer.hint") },
    { href: "/chair/session/speech-notes", label: tPage("tiles.speechNotes.label"), hint: tPage("tiles.speechNotes.hint") },
    { href: "/chair/session/announcements", label: tPage("tiles.announcements.label"), hint: tPage("tiles.announcements.hint") },
    { href: "/chair/motions-points", label: tPage("tiles.motionsPoints.label"), hint: tPage("tiles.motionsPoints.hint") },
    { href: "/voting", label: tPage("tiles.voting.label"), hint: tPage("tiles.voting.hint") },
    { href: "/chair/awards", label: tPage("tiles.score.label"), hint: tPage("tiles.score.hint") },
    { href: "/chair/notes-moderation", label: tPage("tiles.notesModeration.label"), hint: tPage("tiles.notesModeration.hint") },
    ...(crisisReportingEnabled
      ? ([
          { href: "/crisis", label: tPage("tiles.crisis.label"), hint: tPage("tiles.crisis.hint") },
          { href: "/report", label: tPage("tiles.crisisReport.label"), hint: tPage("tiles.crisisReport.hint") },
        ] as const)
      : []),
    { href: "/documents", label: tPage("tiles.archive.label"), hint: tPage("tiles.archive.hint") },
    { href: "/official-links", label: tPage("tiles.officialUnLinks.label"), hint: tPage("tiles.officialUnLinks.hint") },
    { href: "/chair/room-code", label: tPage("tiles.roomCode.label"), hint: tPage("tiles.roomCode.hint") },
    { href: "/committee-room", label: tPage("tiles.committeeRoomFull.label"), hint: tPage("tiles.committeeRoomFull.hint") },
  ];
  const tiles = [...tilesRaw]
    .sort(
      (a, b) => hrefPriorityRank(a.href, CHAIR_HUB_TILE_HREF_ORDER) - hrefPriorityRank(b.href, CHAIR_HUB_TILE_HREF_ORDER)
    )
    .map((tile, index) => ({ ...tile, priority: index + 1 }));

  const { tab } = await searchParams;
  const tabs = withSequentialPriority(
    sortByKeyPriority(
      [
        { id: "overview", label: td("dashboardTabs.overview") },
        { id: "guidance", label: td("dashboardTabs.guidance") },
        { id: "jump", label: td("dashboardTabs.jump") },
      ],
      "id",
      CHAIR_DASHBOARD_TAB_ORDER
    )
  );
  const activeTab = tab === "guidance" || tab === "jump" ? tab : "overview";

  const floorTools = [
    {
      href: "/chair/session/timer",
      label: tPage("tiles.timer.label"),
      hint: tPage("tiles.timer.hint"),
      emoji: "⏱️",
    },
    {
      href: "/chair/session/speakers",
      label: tPage("tiles.speakers.label"),
      hint: tPage("tiles.speakers.hint"),
      emoji: "🎤",
    },
    {
      href: "/chair/session/motions",
      label: tPage("tiles.motionsPoints.label"),
      hint: tPage("tiles.motionsPoints.hint"),
      emoji: "📜",
    },
  ];
  const chamberTools = [
    {
      href: "/chair/session/announcements",
      label: tPage("tiles.announcements.label"),
      hint: tPage("tiles.announcements.hint"),
      emoji: "📣",
    },
    {
      href: "/chair/session/discipline",
      label: tPage("tiles.disciplinary.label"),
      hint: tPage("tiles.disciplinary.hint"),
      emoji: "⚖️",
    },
    {
      href: "/chair/awards",
      label: tPage("tiles.score.label"),
      hint: tPage("tiles.score.hint"),
      emoji: "📊",
    },
  ];
  const peopleTools = [
    {
      href: "/chair/allocation-matrix",
      label: tPage("tiles.delegates.label"),
      hint: tPage("tiles.delegates.hint"),
      emoji: "👥",
    },
    {
      href: "/chair/notes-moderation",
      label: tPage("tiles.notesModeration.label"),
      hint: tPage("tiles.notesModeration.hint"),
      emoji: "📝",
    },
    {
      href: "/chair/session/speech-notes",
      label: tPage("tiles.speechNotes.label"),
      hint: tPage("tiles.speechNotes.hint"),
      emoji: "🗒️",
    },
  ];

  return (
    <MunPageShell title={t("chairRoom")} variant="split">
      <div className="space-y-8">
        <header className="dashboard-panel relative overflow-hidden !p-4 md:!p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[var(--gold)] via-[var(--gold-bright)] to-transparent"
          />
          <h1 className="font-sans text-[1.95rem] font-semibold tracking-tight text-brand-navy dark:text-zinc-100">
            {tPage("welcome", { committee: committeeLabel })}
          </h1>
          <p className="mt-2 text-base font-medium text-brand-navy dark:text-zinc-100">
            {tPage("featureStrip")}
          </p>
          <p className="mt-2 text-sm text-brand-muted dark:text-zinc-400">
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

        <div
          className="flex flex-wrap gap-2 border-b border-brand-navy/10 pb-1 dark:border-white/10"
          role="tablist"
          aria-label={td("dashboardTabs.ariaLabel")}
        >
          {tabs.map((tabItem) => (
            <PriorityTabLink
              key={tabItem.id}
              href={tabItem.id === "overview" ? "/chair" : `/chair?tab=${tabItem.id}`}
              label={tabItem.label}
              priority={tabItem.priority}
              active={activeTab === tabItem.id}
              activeClassName="border-brand-accent text-brand-navy bg-brand-paper dark:bg-[var(--material-thick)] dark:text-zinc-100"
              inactiveClassName="border-transparent text-brand-muted hover:text-brand-navy hover:bg-brand-cream/40 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
            />
          ))}
        </div>

        {activeTab === "overview" ? (
          <div className="space-y-8">
            <ChairTopicTabsCard
              topics={debateBundle.debateTopicOptions}
              activeTopicId={debateBundle.debateConferenceId}
              committeeLabelRaw={debateBundle.committeeLabelRaw}
            />
            <ChairHubComposition
              floorTitle={tPage("hub.floorTitle")}
              floorBody={tPage("hub.floorBody")}
              chamberTitle={tPage("hub.chamberTitle")}
              chamberBody={tPage("hub.chamberBody")}
              peopleTitle={tPage("hub.peopleTitle")}
              peopleBody={tPage("hub.peopleBody")}
              sessionTitle={tPage("hub.sessionTitle")}
              sessionStatus={sessionStatus}
              sessionHref="/chair/session"
              sessionCta={tPage("hub.sessionCta")}
              sessionLive={sessionLive}
              heldNotesLabel={
                (heldNotesCount ?? 0) > 0
                  ? tPage("hub.heldNotes", { count: heldNotesCount ?? 0 })
                  : null
              }
              notesHref="/chair/notes-moderation"
              floorTools={floorTools}
              chamberTools={chamberTools}
              peopleTools={peopleTools}
            />
            <MilestonesSummaryCard href="/milestones" />
            <p className="text-sm text-brand-muted">
              <Link href="/chair?tab=jump" className="font-medium text-[#007AFF] hover:text-[#0077ED]">
                {tPage("hub.seeAllTools")}
              </Link>
            </p>
          </div>
        ) : null}

        {activeTab === "guidance" ? (
          <div className="space-y-6">
            <ChairHowToAccordion />
            <RoleSetupChecklist role="chair" />
          </div>
        ) : null}

        {activeTab === "jump" ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-zinc-400">
              {td("dashboardTabs.jump")}
            </h3>
            <p className="mt-1 text-xs text-brand-muted dark:text-zinc-400">{tc("navPriorityOrderHint")}</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((tile) => (
                <li key={tile.href} className={tile.priority % 5 === 0 ? "sm:translate-y-3" : undefined}>
                  <HubTileLink
                    href={tile.href}
                    label={tile.label}
                    hint={tile.hint}
                    priority={tile.priority}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </MunPageShell>
  );
}
