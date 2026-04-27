"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  MessageSquare,
  BookOpen,
  FileText,
  Compass,
  Lightbulb,
  Link2,
  FileCheck,
  Scale,
  Mic,
  ClipboardList,
  Flag,
  Presentation,
  Landmark,
  ListOrdered,
  DoorOpen,
  PanelsTopLeft,
  Trophy,
  LayoutDashboard,
  Layers,
  Library,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";

const BASE_TABS = [
  { href: "/delegate", labelKey: "delegateHub", icon: LayoutDashboard },
  { href: "/profile", labelKey: "profile", icon: User },
  { href: "/chats-notes", labelKey: "notes", icon: MessageSquare },
  { href: "/committee-room", labelKey: "committee", icon: Landmark },
  { href: "/voting", labelKey: "voting", icon: Scale },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/documents", labelKey: "documents", icon: FileText },
  { href: "/stances", labelKey: "stances", icon: Compass },
  { href: "/ideas", labelKey: "ideas", icon: Lightbulb },
  { href: "/sources", labelKey: "sources", icon: Link2 },
  { href: "/resolutions", labelKey: "resolutions", icon: FileCheck },
  { href: "/speeches", labelKey: "speeches", icon: Mic },
  { href: "/running-notes", labelKey: "running", icon: ClipboardList },
  { href: "/report", labelKey: "report", icon: Flag },
  { href: "/crisis-slides", labelKey: "crisisSlides", icon: Presentation },
] as const;

const CRISIS_ONLY_HREFS = new Set<string>(["/report", "/crisis-slides"]);

function useNavTabs(staffRole: UserRole | null | undefined, crisisReportingEnabled: boolean) {
  const role = staffRole ?? null;
  const baseTabs = crisisReportingEnabled
    ? [...BASE_TABS]
    : BASE_TABS.filter((t) => !CRISIS_ONLY_HREFS.has(t.href));
  return role === "chair" || role === "smt" || role === "admin"
    ? [
        ...baseTabs.slice(0, 3),
        { href: "/chair/room-code", labelKey: "committeeCode", icon: DoorOpen },
        ...(role === "chair"
          ? ([{ href: "/chair/session", labelKey: "session", icon: PanelsTopLeft }] as const)
          : []),
        ...(role === "smt" || role === "admin"
          ? ([{ href: "/smt/allocation-passwords", labelKey: "passwords", icon: ListOrdered }] as const)
          : []),
        { href: "/chair/allocation-matrix", labelKey: "matrix", icon: ListOrdered },
        { href: "/chair/awards", labelKey: "awards", icon: Trophy },
        ...baseTabs.slice(3),
      ]
    : [...baseTabs];
}

type MainTabKey = "home" | "session" | "library";
type MainTab = { key: MainTabKey; labelKey: "home" | "session" | "library"; icon: LucideIcon };

const MAIN_TABS: MainTab[] = [
  { key: "home", labelKey: "home", icon: Layers },
  { key: "session", labelKey: "session", icon: Brain },
  { key: "library", labelKey: "library", icon: Library },
];

const MAIN_TAB_TILE_CLASS: Record<MainTabKey, string> = {
  home: "bg-[#007AFF]",
  session: "bg-[#5856D6]",
  library: "bg-[#FF9500]",
};

function tabInPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabMainGroup(href: string): MainTabKey {
  if (href === "/delegate" || href === "/profile") return "home";
  if (
    href === "/chats-notes" ||
    href === "/committee-room" ||
    href === "/voting" ||
    href === "/resolutions" ||
    href === "/running-notes" ||
    href === "/report" ||
    href === "/crisis-slides"
  ) {
    return "session";
  }
  return "library";
}

function AspireSidebarLink({
  tab,
  label,
  isActive,
}: {
  tab: { href: string; labelKey: string; icon: LucideIcon };
  label: string;
  isActive: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-0 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-apple group-hover:justify-start group-hover:gap-3 group-hover:px-2.5",
        isActive
          ? "bg-[var(--accent)] font-semibold text-white"
          : "font-medium text-brand-muted hover:bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]"
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-brand-muted")}
        strokeWidth={1.75}
      />
      <span className="hidden truncate group-hover:block">{label}</span>
    </Link>
  );
}

function DockLink({
  tab,
  label,
  isActive,
}: {
  tab: { href: string; labelKey: string; icon: LucideIcon };
  label: string;
  isActive: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      title={label}
      className="group flex shrink-0 snap-start flex-col items-center gap-0.5 px-1.5 py-1.5 transition-apple active:scale-[0.97]"
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center text-brand-muted transition-apple",
          isActive && "text-[var(--accent)]"
        )}
      >
        <Icon
          className={cn("h-6 w-6", isActive && "text-[var(--accent)]")}
          strokeWidth={isActive ? 2.25 : 1.75}
        />
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "font-semibold text-[var(--accent)]" : "text-brand-muted"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function TabNav({
  staffRole = null,
  variant,
  crisisReportingEnabled = true,
}: {
  staffRole?: UserRole | null;
  variant: "aspire-sidebar" | "dock";
  /** When false, hide `/report` and `/crisis-slides` (crisis committees: FWC, UNSC, HSC). */
  crisisReportingEnabled?: boolean;
}) {
  const t = useTranslations("tabNav");
  const pathname = usePathname();
  const tabs = useNavTabs(staffRole, crisisReportingEnabled);
  const groupedTabs = useMemo(() => {
    const groups: Record<MainTabKey, { href: string; labelKey: string; icon: LucideIcon }[]> = {
      home: [],
      session: [],
      library: [],
    };
    for (const t of tabs) groups[tabMainGroup(t.href)].push(t);
    return groups;
  }, [tabs]);
  const activeMain = useMemo<MainTabKey>(() => {
    for (const mt of MAIN_TABS) {
      const sub = groupedTabs[mt.key];
      if (sub.some((t) => tabInPath(pathname, t.href))) return mt.key;
    }
    return "home";
  }, [groupedTabs, pathname]);
  const [selectedMain, setSelectedMain] = useState<MainTabKey>(activeMain);
  useEffect(() => {
    setSelectedMain(activeMain);
  }, [activeMain]);
  const visibleTabs = groupedTabs[selectedMain];

  if (variant === "aspire-sidebar") {
    return (
      <nav
        aria-label={t("mainNavigationAria")}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 group-hover:px-3 [scrollbar-width:thin]"
      >
        <div className="px-1 pb-2 pt-1 group-hover:px-2">
          <p className="hidden px-1 pb-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-brand-muted group-hover:block">
            {t("mainTabs")}
          </p>
          <div className="grid grid-cols-1 gap-1 group-hover:grid-cols-3">
            {MAIN_TABS.map((mt) => {
              const Icon = mt.icon;
              const selected = selectedMain === mt.key;
              return (
                <button
                  key={mt.key}
                  type="button"
                  onClick={() => setSelectedMain(mt.key)}
                  className={cn(
                    "inline-flex w-full min-w-0 items-center justify-center gap-0 rounded-[var(--radius-sm)] py-1.5 pl-1.5 pr-1 text-[0.7rem] font-medium transition-apple group-hover:gap-1.5",
                    selected
                      ? "text-[var(--color-text)]"
                      : "text-brand-muted opacity-90 hover:opacity-100"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-white shadow-sm",
                      MAIN_TAB_TILE_CLASS[mt.key],
                      !selected && "opacity-50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                  </span>
                  <span className="hidden min-w-0 truncate group-hover:inline">{t(mt.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="hidden px-3 pb-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-brand-muted group-hover:block">
            {t("subtabs")}
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleTabs.map((tab) => (
              <AspireSidebarLink
                key={tab.href}
                tab={tab}
                label={t(tab.labelKey)}
                isActive={tabInPath(pathname, tab.href)}
              />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <div className="pointer-events-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <nav
        aria-label={t("mainNavigationAria")}
        className="mx-auto max-w-2xl overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-chrome)] px-2 py-2.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.55)]"
      >
        <div className="flex min-w-full flex-col gap-1.5">
          <div
            className="inline-flex w-full shrink-0 gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--material-thin)] p-0.5"
            role="tablist"
            aria-label={t("mainTabs")}
          >
            {MAIN_TABS.map((mt) => {
              const Icon = mt.icon;
              const selected = selectedMain === mt.key;
              return (
                <button
                  key={mt.key}
                  type="button"
                  onClick={() => setSelectedMain(mt.key)}
                  className={cn(
                    "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-2.5 py-1.5 text-[0.7rem] font-medium transition-apple sm:flex-initial",
                    selected
                      ? "bg-[var(--material-thick)] font-semibold text-brand-navy shadow-sm"
                      : "text-brand-muted"
                  )}
                >
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", selected && "text-[var(--accent)]")}
                    strokeWidth={1.8}
                  />
                  {t(mt.labelKey)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-row items-stretch gap-0.5 overflow-x-auto px-0.5 pb-0.5">
            {visibleTabs.map((tab) => (
              <DockLink key={tab.href} tab={tab} label={t(tab.labelKey)} isActive={tabInPath(pathname, tab.href)} />
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
