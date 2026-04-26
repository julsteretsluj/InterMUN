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

function tabInPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabMainGroup(href: string): MainTabKey {
  if (href === "/delegate" || href === "/profile") return "home";
  if (
    href === "/chats-notes" ||
    href === "/committee-room" ||
    href === "/voting" ||
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
        "flex items-center justify-center gap-0 group-hover:justify-start group-hover:gap-3 rounded-xl px-2 group-hover:px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-brand-accent/12 font-semibold text-brand-navy ring-1 ring-brand-accent/28 dark:bg-brand-accent/18 dark:text-brand-accent-bright dark:ring-white/10"
          : "font-medium text-brand-muted hover:bg-brand-navy/5 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-brand-diplomatic dark:text-brand-accent-bright" : "text-brand-muted dark:text-zinc-500"
        )}
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
      className="group flex shrink-0 snap-start flex-col items-center gap-1 px-1.5 py-2"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-all duration-200",
          isActive
            ? "scale-[1.02] border-brand-accent/35 bg-brand-accent/14 text-brand-navy shadow-md shadow-brand-accent/15 dark:border-brand-accent/45 dark:bg-brand-accent/18 dark:text-brand-accent-bright dark:shadow-none"
            : "border-brand-navy/10 bg-white text-brand-muted group-hover:border-brand-accent/30 group-hover:bg-brand-navy/5 group-hover:text-brand-diplomatic dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-brand-accent/35 dark:group-hover:bg-zinc-800"
        )}
      >
        <Icon className="h-[1.35rem] w-[1.35rem] opacity-95" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "text-brand-diplomatic dark:text-brand-accent-bright" : "text-brand-muted dark:text-zinc-400"
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
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 group-hover:px-3 [scrollbar-width:thin]"
      >
        <div className="px-1 pb-2 pt-1 group-hover:px-2">
          <p className="hidden px-1 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-muted dark:text-zinc-500 group-hover:block">
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
                    "inline-flex items-center justify-center gap-0 rounded-lg px-2 py-1.5 text-[0.7rem] font-medium transition group-hover:gap-1",
                    selected
                      ? "bg-brand-accent/12 text-brand-navy dark:bg-brand-accent/18 dark:text-brand-accent-bright"
                      : "text-brand-muted hover:bg-brand-navy/5 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                  <span className="hidden group-hover:inline">{t(mt.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="hidden px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-muted dark:text-zinc-500 group-hover:block">
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
    <nav
      aria-label="Main navigation"
      className="flex flex-row items-stretch gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-brand-navy/10 bg-color-surface/95 px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-discord-divider dark:bg-discord-sidebar/98 dark:backdrop-blur-md"
    >
      <div className="flex flex-col gap-1 min-w-full">
        <div className="flex flex-row gap-1 overflow-x-auto">
          {MAIN_TABS.map((mt) => {
            const Icon = mt.icon;
            const selected = selectedMain === mt.key;
            return (
              <button
                key={mt.key}
                type="button"
                onClick={() => setSelectedMain(mt.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-medium transition shrink-0",
                  selected
                    ? "border-brand-accent/35 bg-brand-accent/12 text-brand-navy dark:border-brand-accent/40 dark:bg-brand-accent/16 dark:text-brand-accent-bright"
                    : "border-brand-navy/10 bg-white text-brand-muted dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {t(mt.labelKey)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-row items-stretch gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <DockLink key={tab.href} tab={tab} label={t(tab.labelKey)} isActive={tabInPath(pathname, tab.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
