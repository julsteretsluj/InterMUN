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
  Mic,
  ClipboardList,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/chats-notes", label: "Chats/Notes", icon: MessageSquare },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/stances", label: "Stances", icon: Compass },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/sources", label: "Sources", icon: Link2 },
  { href: "/resolutions", label: "Resolutions", icon: FileCheck },
  { href: "/speeches", label: "Speeches", icon: Mic },
  { href: "/running-notes", label: "Running Notes", icon: ClipboardList },
  { href: "/report", label: "Report", icon: Flag },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 sm:gap-2 border-b border-white/10 pb-3 -mb-px overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-gold text-brand-navy shadow-sm"
                : "text-brand-paper/75 hover:text-brand-paper hover:bg-white/10"
            )}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-90" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
