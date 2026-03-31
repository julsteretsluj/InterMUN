"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  UserPlus,
  LayoutDashboard,
  Layers,
  Library,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";

const BASE_TABS = [
  { href: "/delegate", label: "Delegate hub", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/follow", label: "Follow", icon: UserPlus },
  { href: "/chats-notes", label: "Notes", icon: MessageSquare },
  { href: "/committee-room", label: "Committee", icon: Landmark },
  { href: "/voting", label: "Voting", icon: Scale },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/stances", label: "Stances", icon: Compass },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/sources", label: "Sources", icon: Link2 },
  { href: "/resolutions", label: "Resolutions", icon: FileCheck },
  { href: "/speeches", label: "Speeches", icon: Mic },
  { href: "/running-notes", label: "Running", icon: ClipboardList },
  { href: "/report", label: "Report", icon: Flag },
  { href: "/crisis-slides", label: "Crisis slides", icon: Presentation },
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
        { href: "/chair/room-code", label: "Committee code", icon: DoorOpen },
        ...(role === "chair"
          ? ([{ href: "/chair/session", label: "Session", icon: PanelsTopLeft }] as const)
          : []),
        { href: "/chair/allocation-passwords", label: "Passwords", icon: ListOrdered },
        { href: "/chair/allocation-matrix", label: "Matrix", icon: ListOrdered },
        { href: "/chair/awards", label: "Awards", icon: Trophy },
        ...baseTabs.slice(3),
      ]
    : [...baseTabs];
}

function aspireSections(tabs: readonly { href: string; label: string; icon: LucideIcon }[]) {
  const libIdx = tabs.findIndex((t) => t.href === "/guides");
  if (libIdx <= 0) {
    return [{ label: null as string | null, tabs: [...tabs] }];
  }
  return [
    { label: "Main" as const, tabs: tabs.slice(0, libIdx) },
    { label: "Library" as const, tabs: tabs.slice(libIdx) },
  ];
}

type MainTabKey = "home" | "session" | "library";
type MainTab = { key: MainTabKey; label: string; icon: LucideIcon };

const MAIN_TABS: MainTab[] = [
  { key: "home", label: "Home", icon: Layers },
  { key: "session", label: "Session", icon: Brain },
  { key: "library", label: "Library", icon: Library },
];

function tabInPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tabMainGroup(href: string): MainTabKey {
  if (href === "/delegate" || href === "/profile" || href === "/follow") return "home";
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
  isActive,
}: {
  tab: { href: string; label: string; icon: LucideIcon };
  isActive: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "flex items-center gap-0 group-hover:gap-3 rounded-xl px-2 group-hover:px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-blue-100 font-semibold text-blue-900 dark:bg-blue-950/55 dark:text-blue-100"
          : "font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-blue-600 dark:text-blue-300" : "text-slate-400 dark:text-zinc-500"
        )}
        strokeWidth={1.75}
      />
      <span className="hidden truncate group-hover:block">{tab.label}</span>
    </Link>
  );
}

function DockLink({
  tab,
  isActive,
}: {
  tab: { href: string; label: string; icon: LucideIcon };
  isActive: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      title={tab.label}
      className="group flex shrink-0 snap-start flex-col items-center gap-1 px-1.5 py-2"
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-all duration-200",
          isActive
            ? "scale-[1.02] border-blue-300/80 bg-blue-100 text-blue-800 shadow-blue-500/10 dark:border-blue-500/40 dark:bg-blue-950/70 dark:text-blue-200"
            : "border-slate-200/90 bg-white text-slate-500 group-hover:border-blue-200 group-hover:bg-slate-50 group-hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-blue-500/30 dark:group-hover:bg-zinc-800"
        )}
      >
        <Icon className="h-[1.35rem] w-[1.35rem] opacity-95" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "text-blue-800 dark:text-blue-200" : "text-slate-600 dark:text-zinc-400"
        )}
      >
        {tab.label}
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
  const pathname = usePathname();
  const tabs = useNavTabs(staffRole, crisisReportingEnabled);
  const groupedTabs = useMemo(() => {
    const groups: Record<MainTabKey, { href: string; label: string; icon: LucideIcon }[]> = {
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
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:thin]"
      >
        <div className="px-2 pb-2 pt-1">
          <p className="px-1 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">
            Main tabs
          </p>
          <div className="grid grid-cols-3 gap-1">
            {MAIN_TABS.map((mt) => {
              const Icon = mt.icon;
              const selected = selectedMain === mt.key;
              return (
                <button
                  key={mt.key}
                  type="button"
                  onClick={() => setSelectedMain(mt.key)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[0.7rem] font-medium transition",
                    selected
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-950/55 dark:text-blue-100"
                      : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                  <span>{mt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">
            Subtabs
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleTabs.map((tab) => (
              <AspireSidebarLink key={tab.href} tab={tab} isActive={tabInPath(pathname, tab.href)} />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-row items-stretch gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-slate-200/80 bg-[#f4f6fb]/95 px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95"
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
                    ? "border-blue-300/80 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/55 dark:text-blue-100"
                    : "border-slate-200/90 bg-white text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {mt.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-row items-stretch gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <DockLink key={tab.href} tab={tab} isActive={tabInPath(pathname, tab.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}
