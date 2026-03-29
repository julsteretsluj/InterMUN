"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Landmark,
  ListOrdered,
  DoorOpen,
  PanelsTopLeft,
  Trophy,
  UserPlus,
  LayoutDashboard,
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
] as const;

function useNavTabs(staffRole: UserRole | null | undefined) {
  const role = staffRole ?? null;
  return role === "chair" || role === "smt" || role === "admin"
    ? [
        ...BASE_TABS.slice(0, 3),
        { href: "/chair/room-code", label: "Committee code", icon: DoorOpen },
        ...(role === "chair"
          ? ([{ href: "/chair/session", label: "Session", icon: PanelsTopLeft }] as const)
          : []),
        { href: "/chair/allocation-passwords", label: "Passwords", icon: ListOrdered },
        { href: "/chair/allocation-matrix", label: "Matrix", icon: ListOrdered },
        { href: "/chair/awards", label: "Awards", icon: Trophy },
        ...BASE_TABS.slice(3),
      ]
    : [...BASE_TABS];
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
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-violet-100 font-semibold text-violet-900 dark:bg-violet-950/55 dark:text-violet-100"
          : "font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          isActive ? "text-violet-600 dark:text-violet-300" : "text-slate-400 dark:text-zinc-500"
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{tab.label}</span>
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
            ? "scale-[1.02] border-violet-300/80 bg-violet-100 text-violet-800 shadow-violet-500/10 dark:border-violet-500/40 dark:bg-violet-950/70 dark:text-violet-200"
            : "border-slate-200/90 bg-white text-slate-500 group-hover:border-violet-200 group-hover:bg-slate-50 group-hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-violet-500/30 dark:group-hover:bg-zinc-800"
        )}
      >
        <Icon className="h-[1.35rem] w-[1.35rem] opacity-95" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "max-w-[4.25rem] text-center text-[0.625rem] font-medium leading-tight",
          isActive ? "text-violet-800 dark:text-violet-200" : "text-slate-600 dark:text-zinc-400"
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
}: {
  staffRole?: UserRole | null;
  variant: "aspire-sidebar" | "dock";
}) {
  const pathname = usePathname();
  const tabs = useNavTabs(staffRole);

  if (variant === "aspire-sidebar") {
    const sections = aspireSections(tabs);
    return (
      <nav
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-2 [scrollbar-width:thin]"
      >
        {sections.map((section, si) => (
          <div key={section.label ?? "all"}>
            {section.label ? (
              <p
                className={cn(
                  "px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500",
                  si === 0 ? "pt-1" : "pt-3"
                )}
              >
                {section.label}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {section.tabs.map((tab) => (
                <AspireSidebarLink key={tab.href} tab={tab} isActive={pathname === tab.href} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-row items-stretch gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-slate-200/80 bg-[#f4f6fb]/95 px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      {tabs.map((tab) => (
        <DockLink key={tab.href} tab={tab} isActive={pathname === tab.href} />
      ))}
    </nav>
  );
}
