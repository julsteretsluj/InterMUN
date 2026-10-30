// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { WorkspaceHomeTile } from "@/components/workspace/RoleWorkspaceHome";
import type { WorkspaceRole } from "@/lib/workspace/types";

/** Primary hub tiles for `/dashboard/[role]` landing canvases. */
export function homeTilesForRole(role: WorkspaceRole): WorkspaceHomeTile[] {
  switch (role) {
    case "delegate":
      return [
        {
          href: "/committee-room",
          title: "Main session canvas",
          description: "Live timers, speaker ticker, announcements, and request to speak.",
          emoji: "🏛️",
          featured: true,
        },
        {
          href: "/voting",
          title: "Voting station",
          description: "Cast Yes / No / Abstain with live quorum context.",
          emoji: "🗳️",
          featured: true,
        },
        {
          href: "/resolutions",
          title: "Resolutions & blocs",
          description: "Clauses, sponsors, signatories, amendments, and Docs links.",
          emoji: "📄",
        },
        {
          href: "/stances",
          title: "Stances heatmap",
          description: "Map country positions across the chamber.",
          emoji: "🧭",
        },
        {
          href: "/speeches",
          title: "Speeches",
          description: "Drafts, outlines, and speech history.",
          emoji: "🎤",
        },
        {
          href: "/chats-notes",
          title: "Notes & messaging",
          description: "Moderated delegate and dais messaging.",
          emoji: "💬",
        },
        {
          href: "/ideas",
          title: "Ideas & sources",
          description: "Scratchpad research and trusted links.",
          emoji: "💡",
        },
        {
          href: "/newsroom",
          title: "Newsroom & Press",
          description: "Headlines feed and Press Corps updates.",
          emoji: "📰",
        },
        {
          href: "/profile",
          title: "Profile & awards",
          description: "Avatar, pronouns, allocation, and feedback.",
          emoji: "👤",
        },
        {
          href: "/delegate",
          title: "Classic delegate hub",
          description: "Existing checklist and countdown cards.",
          emoji: "🌐",
        },
      ];
    case "chair":
      return [
        {
          href: "/chair/session",
          title: "Session control",
          description: "Master clock, roll call, quorum, and floor status.",
          emoji: "▶️",
          featured: true,
        },
        {
          href: "/chair/session/speakers",
          title: "Speakers & motions",
          description: "GSL, caucuses, RoP motion queue, and timers.",
          emoji: "🎤",
          featured: true,
        },
        {
          href: "/chair/digital-room",
          title: "Digital Room",
          description: "Placard grid with compliment, concern, and reminder flags.",
          emoji: "🖥️",
        },
        {
          href: "/chair/session/discipline",
          title: "Discipline",
          description: "Warnings → strikes → speaking and voting rights.",
          emoji: "⚠️",
        },
        {
          href: "/resolutions",
          title: "Resolutions review",
          description: "Draft pipeline and amendment approvals.",
          emoji: "📄",
        },
        {
          href: "/chair/notes-moderation",
          title: "Notes moderation",
          description: "Hold, release, or bounce note traffic.",
          emoji: "🛡️",
        },
        {
          href: "/chair/awards",
          title: "Scoring & awards",
          description: "Rubric nominations and participation scores.",
          emoji: "🏆",
        },
        {
          href: "/chair/prep-checklist",
          title: "Prep checklist",
          description: "Rules, topic, tech, and co-chair readiness.",
          emoji: "✅",
        },
        {
          href: "/chair/room-code",
          title: "Room code",
          description: "Share the six-character committee join code.",
          emoji: "🚪",
        },
        {
          href: "/chair",
          title: "Classic chair hub",
          description: "Existing tile grid and how-to accordion.",
          emoji: "🪑",
        },
      ];
    case "advisor":
      return [
        {
          href: "/advisor",
          title: "Linked delegates",
          description: "Monitor profiles, documents, voting, and notes.",
          emoji: "🎓",
          featured: true,
        },
        {
          href: "/advisor/notes",
          title: "Messaging pipeline",
          description: "Forwarded inbox and direct advisor notes.",
          emoji: "📨",
          featured: true,
        },
        {
          href: "/advisor/schedule",
          title: "Schedule",
          description: "Conference timetable for your delegation.",
          emoji: "🗓️",
        },
        {
          href: "/advisor/newsroom",
          title: "Newsroom",
          description: "Headlines and press updates.",
          emoji: "📰",
        },
        {
          href: "/advisor/guides",
          title: "Guides",
          description: "Reference curriculum for advisors.",
          emoji: "📘",
        },
        {
          href: "/advisor/milestones",
          title: "Milestones",
          description: "Activity checkpoints across linked seats.",
          emoji: "🏅",
        },
      ];
    case "smt":
      return [
        {
          href: "/smt",
          title: "Live committees",
          description: "Realtime status across every chamber.",
          emoji: "📡",
          featured: true,
        },
        {
          href: "/smt/conference",
          title: "Event & chamber config",
          description: "Sessions, branding, procedure profiles.",
          emoji: "⚙️",
          featured: true,
        },
        {
          href: "/smt/allocation-matrix",
          title: "Allocation matrix",
          description: "CRUD seats with CSV import.",
          emoji: "🧩",
        },
        {
          href: "/smt/room-codes",
          title: "Access control",
          description: "Room codes, passwords, and invites.",
          emoji: "🔑",
        },
        {
          href: "/smt/allocation-passwords",
          title: "Allocation passwords",
          description: "Placard codes and code-gate toggle.",
          emoji: "🔐",
        },
        {
          href: "/smt/delegates",
          title: "Delegates directory",
          description: "Search linked delegates and open cards.",
          emoji: "🧑‍🎓",
        },
        {
          href: "/smt/advisors",
          title: "Advisors",
          description: "Invite advisors and link allocations.",
          emoji: "🏫",
        },
        {
          href: "/smt/notes",
          title: "Event-wide notes",
          description: "Filter traffic and dispatch announcements.",
          emoji: "✉️",
        },
      ];
    case "admin":
      return [
        {
          href: "/admin",
          title: "Admin portal",
          description: "Setup, registrations, checklist, and status.",
          emoji: "🛠️",
          featured: true,
        },
        {
          href: "/conference-setup",
          title: "Conference setup",
          description: "Launch events and invite SMT.",
          emoji: "🚀",
        },
        {
          href: "/admin/guides",
          title: "Guides CMS",
          description: "Global reference curriculum.",
          emoji: "📘",
        },
        {
          href: "/admin/newsroom",
          title: "Newsroom",
          description: "Manage headline feeds.",
          emoji: "📰",
        },
        {
          href: "/admin/press-corps",
          title: "Press Corps",
          description: "Press content surfaces.",
          emoji: "📸",
        },
        {
          href: "/admin/milestones",
          title: "Milestones",
          description: "Conference-wide checkpoints.",
          emoji: "🏅",
        },
      ];
  }
}
