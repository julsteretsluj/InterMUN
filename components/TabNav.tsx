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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";

const BASE_TABS = [
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

function AppIconLink({
  tab,
  isActive,
  compact,
}: {
  tab: { href: string; label: string; icon: LucideIcon };
  isActive: boolean;
  compact: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      title={tab.label}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-2xl transition-all duration-200",
        compact ? "px-1.5 py-2 w-full" : "shrink-0 snap-start px-2 py-2 min-w-[4.5rem] max-w-[4.75rem]"
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-[1.15rem] border shadow-md transition-transform duration-200",
          compact ? "h-11 w-11" : "h-12 w-12",
          isActive
            ? "border-brand-gold/70 bg-brand-gold/25 text-brand-accent-ink scale-[1.02] shadow-[0_0_20px_rgba(29,185,84,0.35)]"
            : "border-brand-line/80 bg-brand-navy-soft/40 text-brand-navy group-hover:border-brand-gold/40 group-hover:bg-brand-navy-soft group-hover:scale-105"
        )}
      >
        <Icon className={cn(compact ? "w-[1.35rem] h-[1.35rem]" : "w-6 h-6", "opacity-95")} strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "text-center font-medium leading-tight text-brand-navy/90",
          compact ? "text-[0.625rem] max-w-[4.5rem] px-0.5" : "text-[0.65rem] max-w-[4.25rem]",
          isActive && "text-brand-gold-bright"
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
  variant: "sidebar" | "dock";
}) {
  const pathname = usePathname();
  const tabs = useNavTabs(staffRole);

  if (variant === "sidebar") {
    return (
      <nav
        aria-label="Main navigation"
        className="flex flex-col h-full w-full min-h-0 py-3 px-2 gap-0.5 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]"
      >
        {tabs.map((tab) => (
          <AppIconLink key={tab.href} tab={tab} isActive={pathname === tab.href} compact />
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-row items-stretch gap-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-brand-line/60 bg-brand-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-brand-paper/75 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
    >
      {tabs.map((tab) => (
        <AppIconLink key={tab.href} tab={tab} isActive={pathname === tab.href} compact={false} />
      ))}
    </nav>
  );
}
