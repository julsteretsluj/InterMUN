import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { DelegateCountdownCard } from "@/components/delegate/DelegateCountdownCard";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import { getTranslations } from "next-intl/server";

export default async function DelegateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tp = await getTranslations("pageTitles");
  const td = await getTranslations("delegateDashboard");
  const tc = await getTranslations("common");
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
  const line = [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || tc("committee");
  const countryLabel = myAllocation?.country?.trim() || profile?.country?.trim() || tc("yourCountry");
  const countryFlag = flagEmojiForCountryName(countryLabel);
  const crisisReportingEnabled = isCrisisCommittee(conf?.committee ?? null);

  const tileDefs: { href: string; key: string }[] = [
    { href: "/stances", key: "stances" },
    { href: "/delegate#countdown", key: "countdown" },
    { href: "/committee-room", key: "matrix" },
    { href: "/speeches", key: "speeches" },
    { href: "/sources", key: "sources" },
    { href: "/guides", key: "guides" },
    { href: "/running-notes", key: "running" },
    { href: "/official-links", key: "officialLinks" },
    { href: "/delegate/chair-feedback", key: "chairFeedback" },
    { href: "/voting", key: "voting" },
    { href: "/documents", key: "archive" },
    ...(crisisReportingEnabled
      ? [
          { href: "/crisis-slides", key: "crisisSlides" },
          { href: "/report", key: "crisisReport" },
        ]
      : []),
  ];

  const tiles = tileDefs.map((def) => ({
    href: def.href,
    label: td(`tiles.${def.key}.label`),
    hint: td(`tiles.${def.key}.hint`),
  }));
  const { tab } = await searchParams;
  const dashboardTabs = [
    { id: "overview", label: td("tabs.overview") },
    { id: "checklist", label: td("tabs.checklist") },
    { id: "jump", label: td("tabs.jump") },
  ] as const;
  const activeTab = tab === "checklist" || tab === "jump" ? tab : "overview";

  return (
    <MunPageShell title={tp("delegateDashboard")}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="font-display text-[1.85rem] font-semibold text-brand-navy">
            {td("welcome", { flag: countryFlag, country: countryLabel })}
          </h1>
          <p className="text-sm text-brand-muted">
            {td("activeCommitteeIntro", { line })}{" "}
            {td("activeCommitteeBody")}
          </p>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-brand-navy/10" role="tablist" aria-label={td("tabs.ariaLabel")}>
          {dashboardTabs.map((tabItem) => (
            <Link
              href={tabItem.id === "overview" ? "/delegate" : `/delegate?tab=${tabItem.id}`}
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
        {activeTab === "overview" ? <DelegateCountdownCard conferenceId={conferenceId} /> : null}
        {activeTab === "checklist" ? <RoleSetupChecklist role="delegate" /> : null}
        {activeTab === "jump" ? (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-zinc-400">{td("jumpTo")}</h2>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {tiles.map((tile) => (
              <li key={tile.href + tile.label}>
                <Link
                  href={tile.href}
                  className="block rounded-lg border border-brand-navy/10 bg-white px-3.5 py-2.5 shadow-sm transition hover:border-brand-accent/45 hover:bg-brand-accent/8 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-brand-accent/40 dark:hover:bg-brand-accent/12"
                >
                  <span className="font-semibold text-brand-navy dark:text-zinc-50">{tile.label}</span>
                  <span className="mt-0.5 block text-xs text-brand-muted dark:text-zinc-400">{tile.hint}</span>
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
