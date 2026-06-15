import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { requireActiveConferenceId } from "@/lib/active-conference";
import { DelegateCountdownCard } from "@/components/delegate/DelegateCountdownCard";
import { isCrisisCommittee } from "@/lib/crisis-committee";
import { RoleSetupChecklist } from "@/components/onboarding/RoleSetupChecklist";
import { flagEmojiForCountryName } from "@/lib/country-flag-emoji";
import {
  SEAMUN_I_2027_DELEGATE_CHAIR_CONTACTS,
  seamunChairContactMatchesCommittee,
} from "@/lib/seamun-delegate-chair-contacts";
import { SEAMUN_I_2027_EVENT_CODE } from "@/lib/seamun-i-2027-secretariat-roster";
import { DelegateHubTileLink } from "@/components/delegate/DelegateHubTileLink";
import { PriorityTabLink } from "@/components/PriorityTabLink";
import {
  DELEGATE_DASHBOARD_TAB_ORDER,
  DELEGATE_HUB_TILE_KEY_ORDER,
  sortByKeyPriority,
  withSequentialPriority,
} from "@/lib/nav-priority-order";
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
    .select("country, role, smt_delegate_allocation_id")
    .eq("id", user.id)
    .maybeSingle();

  const conferenceId = await requireActiveConferenceId();

  const role = profile?.role?.toString().trim().toLowerCase();
  let myAllocation: { country: string | null } | null = null;
  const previewAllocId = (profile as { smt_delegate_allocation_id?: string | null } | null)
    ?.smt_delegate_allocation_id;
  if (role === "smt" && previewAllocId) {
    const { data: previewAlloc } = await supabase
      .from("allocations")
      .select("country")
      .eq("id", previewAllocId)
      .maybeSingle();
    myAllocation = previewAlloc;
  }
  if (!myAllocation) {
    const { data: linkedAlloc } = await supabase
      .from("allocations")
      .select("country")
      .eq("conference_id", conferenceId)
      .eq("user_id", user.id)
      .maybeSingle();
    myAllocation = linkedAlloc;
  }
  const { data: conf } = await supabase
    .from("conferences")
    .select("committee, tagline, name, event_id")
    .eq("id", conferenceId)
    .maybeSingle();

  const { data: eventRow } = conf?.event_id
    ? await supabase.from("conference_events").select("event_code").eq("id", conf.event_id).maybeSingle()
    : { data: null as { event_code: string } | null };
  const showChairEmailsTab =
    (eventRow?.event_code ?? "").trim().toUpperCase() === SEAMUN_I_2027_EVENT_CODE;
  const line = [conf?.committee, conf?.tagline].filter(Boolean).join(" · ") || conf?.name || tc("committee");
  const countryLabel = myAllocation?.country?.trim() || profile?.country?.trim() || tc("yourCountry");
  const countryFlag = flagEmojiForCountryName(countryLabel);
  const crisisReportingEnabled = isCrisisCommittee(conf?.committee ?? null);

  const chairContactsForDelegate = showChairEmailsTab
    ? SEAMUN_I_2027_DELEGATE_CHAIR_CONTACTS.filter((row) =>
        seamunChairContactMatchesCommittee(row, conf?.committee ?? null)
      )
    : [];

  const tileDefsRaw: { href: string; key: string }[] = [
    { href: "/stances", key: "stances" },
    { href: "/delegate#countdown", key: "countdown" },
    { href: "/committee-room", key: "matrix" },
    { href: "/speeches", key: "speeches" },
    { href: "/sources", key: "sources" },
    { href: "/guides", key: "guides" },
    ...(showChairEmailsTab ? ([{ href: "/delegate/schedule", key: "conferenceSchedule" }] as const) : []),
    { href: "/running-notes", key: "running" },
    { href: "/official-links", key: "officialLinks" },
    ...(showChairEmailsTab ? ([{ href: "/delegate?tab=chairs", key: "chairEmails" }] as const) : []),
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

  const tiles = withSequentialPriority(
    sortByKeyPriority(tileDefsRaw, "key", DELEGATE_HUB_TILE_KEY_ORDER)
  ).map((def) => ({
    href: def.href,
    label: td(`tiles.${def.key}.label`),
    hint: td(`tiles.${def.key}.hint`),
    priority: def.priority,
  }));

  const { tab } = await searchParams;
  const dashboardTabsRaw = [
    { id: "overview", label: td("tabs.overview") },
    { id: "checklist", label: td("tabs.checklist") },
    { id: "jump", label: td("tabs.jump") },
    ...(showChairEmailsTab ? ([{ id: "chairs", label: td("tabs.chairEmails") }] as const) : []),
  ];
  const dashboardTabs = withSequentialPriority(
    sortByKeyPriority(dashboardTabsRaw, "id", DELEGATE_DASHBOARD_TAB_ORDER)
  );
  const validTabs = new Set(["overview", "checklist", "jump", ...(showChairEmailsTab ? ["chairs"] : [])]);
  const activeTab = tab && validTabs.has(tab) ? tab : "overview";

  return (
    <MunPageShell title={tp("delegateDashboard")}>
      <div className="space-y-6">
        <header className="dashboard-panel !p-5 md:!p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">{line}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-brand-navy md:text-[1.65rem]">
            {td("welcome", { flag: countryFlag, country: countryLabel })}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
            {td("activeCommitteeIntro", { line })}{" "}
            {td("activeCommitteeBody")}
          </p>
          <div className="mt-3">
            <span className="dashboard-status-badge dashboard-status-badge--info">{tc("committee")}</span>
          </div>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-[var(--hairline)]" role="tablist" aria-label={td("tabs.ariaLabel")}>
          {dashboardTabs.map((tabItem) => (
            <PriorityTabLink
              key={tabItem.id}
              href={tabItem.id === "overview" ? "/delegate" : `/delegate?tab=${encodeURIComponent(tabItem.id)}`}
              label={tabItem.label}
              priority={tabItem.priority}
              active={activeTab === tabItem.id}
              activeClassName="border-[var(--accent)] text-[var(--accent)] bg-white"
              inactiveClassName="border-transparent text-brand-muted hover:text-brand-navy hover:bg-white/60"
            />
          ))}
        </div>
        {activeTab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <DelegateCountdownCard conferenceId={conferenceId} />
            <section className="dashboard-panel flex flex-col justify-between gap-4">
              <div>
                <h2 className="dashboard-panel-title">{td("jumpTo")}</h2>
                <p className="mt-1 text-sm text-brand-muted">{td("activeCommitteeBody")}</p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {tiles.slice(0, 4).map((tile) => (
                  <li key={tile.href + tile.label}>
                    <DelegateHubTileLink
                      href={tile.href}
                      label={tile.label}
                      hint={tile.hint}
                      priority={tile.priority}
                      variant="overview"
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
        {activeTab === "checklist" ? <RoleSetupChecklist role="delegate" /> : null}
        {activeTab === "jump" ? (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted dark:text-zinc-400">{td("jumpTo")}</h2>
          <p className="mt-1 text-xs text-brand-muted">{tc("navPriorityOrderHint")}</p>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {tiles.map((tile) => (
              <li key={tile.href + tile.label}>
                <DelegateHubTileLink
                  href={tile.href}
                  label={tile.label}
                  hint={tile.hint}
                  priority={tile.priority}
                  variant="jump"
                />
              </li>
            ))}
          </ul>
        </div>
        ) : null}
        {activeTab === "chairs" && showChairEmailsTab ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-muted max-w-2xl">{td("chairContacts.intro")}</p>
            {chairContactsForDelegate.length === 0 ? (
              <p className="text-sm text-brand-muted max-w-2xl rounded-lg border border-brand-navy/10 bg-brand-paper px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                {td("chairContacts.noMatch")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-navy/10 bg-brand-paper dark:border-zinc-700 dark:bg-zinc-900/40">
                <table className="w-full min-w-[20rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-navy/10 bg-brand-cream/60 dark:border-zinc-700 dark:bg-zinc-800/80">
                      <th className="px-3 py-2 font-semibold text-brand-navy dark:text-zinc-100">
                        {td("chairContacts.committeeColumn")}
                      </th>
                      <th className="px-3 py-2 font-semibold text-brand-navy dark:text-zinc-100">
                        {td("chairContacts.emailColumn")}
                      </th>
                      <th className="px-3 py-2 w-28 font-semibold text-brand-navy dark:text-zinc-100" />
                    </tr>
                  </thead>
                  <tbody>
                    {chairContactsForDelegate.map((row) => (
                      <tr
                        key={row.email}
                        className="border-b border-brand-navy/5 last:border-0 bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)] dark:border-zinc-700/80 dark:bg-brand-accent/15"
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <span className="font-medium text-brand-navy dark:text-zinc-100">{row.committeeLabel}</span>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <code className="font-mono text-xs text-brand-navy/90 dark:text-zinc-200">{row.email}</code>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <a
                            href={`mailto:${row.email}`}
                            className="text-xs font-medium text-brand-accent hover:underline"
                          >
                            {td("chairContacts.openMail")}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </MunPageShell>
  );
}
