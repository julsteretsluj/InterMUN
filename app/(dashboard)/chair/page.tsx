import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { ChairHowToAccordion } from "@/components/chair/ChairHowToAccordion";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { MilestonesSummaryCard } from "@/components/milestones/MilestonesSummaryCard";
import { PriorityTabLink } from "@/components/PriorityTabLink";
import {
  CHAIR_DASHBOARD_TAB_ORDER,
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

  const { tab } = await searchParams;
  const tabs = withSequentialPriority(
    sortByKeyPriority(
      [
        { id: "overview", label: td("dashboardTabs.overview") },
        { id: "guidance", label: td("dashboardTabs.guidance") },
      ],
      "id",
      CHAIR_DASHBOARD_TAB_ORDER
    )
  );
  const activeTab = tab === "guidance" ? tab : "overview";

  return (
    <MunPageShell title={t("chairRoom")} variant="split">
      <div className="space-y-8">
        <header className="space-y-3">
          <span
            aria-hidden
            className="block h-[3px] w-10 rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)]"
          />
          <h1 className="font-sans text-[1.95rem] font-semibold tracking-tight text-brand-navy dark:text-zinc-100">
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

        <div className="flex flex-wrap gap-2 border-b border-brand-navy/10 pb-1 dark:border-white/10" role="tablist" aria-label={td("dashboardTabs.ariaLabel")}>
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
          <div className="space-y-6">
            <MilestonesSummaryCard href="/milestones" />
          </div>
        ) : null}
        {activeTab === "guidance" ? (
          <div className="space-y-6">
            <ChairHowToAccordion />
            <RoleSetupChecklist role="chair" />
          </div>
        ) : null}
      </div>
    </MunPageShell>
  );
}
