// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import Link from "next/link";
import { HubTileLink } from "@/components/HubTileLink";
import { cn } from "@/lib/utils";

export type ChairHubTool = {
  href: string;
  label: string;
  hint: string;
  emoji: string;
};

type ChairHubCompositionProps = {
  floorTitle: string;
  floorBody: string;
  chamberTitle: string;
  chamberBody: string;
  peopleTitle: string;
  peopleBody: string;
  sessionTitle: string;
  sessionStatus: string;
  sessionHref: string;
  sessionCta: string;
  sessionLive: boolean;
  heldNotesLabel: string | null;
  notesHref: string;
  floorTools: ChairHubTool[];
  chamberTools: ChairHubTool[];
  peopleTools: ChairHubTool[];
};

function FeaturedToolLink({
  tool,
  className,
  emphasis = "primary",
}: {
  tool: ChairHubTool;
  className?: string;
  emphasis?: "primary" | "secondary";
}) {
  return (
    <Link
      href={tool.href}
      className={cn(
        "group relative flex h-full flex-col justify-between overflow-hidden rounded-[16px] border px-5 py-5 transition-[border-color,box-shadow] duration-300 ease-[var(--ease-apple-out)]",
        emphasis === "primary"
          ? "border-[color-mix(in_srgb,#007AFF_22%,#D1D1D6)] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#007AFF]"
          : "border-[#D1D1D6] bg-[#F2F2F7] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-900",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-[12px] text-lg",
            emphasis === "primary"
              ? "bg-[color-mix(in_srgb,#007AFF_12%,white)]"
              : "bg-white dark:bg-zinc-800"
          )}
          aria-hidden
        >
          {tool.emoji}
        </span>
        <span
          aria-hidden
          className="text-[#AEAEB2] transition-colors group-hover:text-[#007AFF]"
        >
          →
        </span>
      </div>
      <div className="mt-6 space-y-1.5">
        <p className="font-sans text-[1.05rem] font-semibold tracking-[-0.01em] text-[#1D1D1F] dark:text-zinc-100">
          {tool.label}
        </p>
        <p className="max-w-[28ch] text-sm leading-relaxed text-[#6E6E73] dark:text-zinc-400">
          {tool.hint}
        </p>
      </div>
    </Link>
  );
}

function SectionHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl space-y-1.5">
      <h2 className="font-sans text-lg font-semibold tracking-[-0.015em] text-[#1D1D1F] dark:text-zinc-100">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-[#6E6E73] dark:text-zinc-400">{body}</p>
    </div>
  );
}

export function ChairHubComposition({
  floorTitle,
  floorBody,
  chamberTitle,
  chamberBody,
  peopleTitle,
  peopleBody,
  sessionTitle,
  sessionStatus,
  sessionHref,
  sessionCta,
  sessionLive,
  heldNotesLabel,
  notesHref,
  floorTools,
  chamberTools,
  peopleTools,
}: ChairHubCompositionProps) {
  const [timer, speakers, motions] = floorTools;
  const [announcements, discipline, awards] = chamberTools;
  const [delegates, notes, speechNotes] = peopleTools;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[20px] border border-[#D1D1D6] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/80">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#007AFF]"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 pl-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6E73]">
              {sessionTitle}
            </p>
            <p className="font-sans text-xl font-semibold tracking-[-0.02em] text-[#1D1D1F] dark:text-zinc-100">
              {sessionStatus}
            </p>
            {heldNotesLabel ? (
              <Link
                href={notesHref}
                className="inline-flex text-sm font-medium text-[#007AFF] hover:text-[#0077ED]"
              >
                {heldNotesLabel}
              </Link>
            ) : null}
          </div>
          <Link
            href={sessionHref}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-[980px] px-5 py-2.5 text-sm font-semibold transition-colors",
              sessionLive
                ? "bg-[#007AFF] text-white hover:bg-[#0077ED]"
                : "border border-[#D1D1D6] bg-[#F2F2F7] text-[#1D1D1F] hover:bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            )}
          >
            {sessionCta}
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title={floorTitle} body={floorBody} />
        <div className="grid gap-3 md:grid-cols-12 md:gap-4">
          {timer ? (
            <FeaturedToolLink tool={timer} emphasis="primary" className="md:col-span-7 md:min-h-[11rem]" />
          ) : null}
          <div className="grid gap-3 md:col-span-5">
            {speakers ? <FeaturedToolLink tool={speakers} emphasis="secondary" /> : null}
            {motions ? <FeaturedToolLink tool={motions} emphasis="secondary" /> : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SectionHeader title={chamberTitle} body={chamberBody} />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[announcements, discipline, awards].filter(Boolean).map((tool, index) => (
            <li
              key={tool!.href}
              className={cn(index === 0 && "sm:col-span-2 lg:col-span-1 lg:translate-y-2")}
            >
              <HubTileLink
                href={tool!.href}
                label={tool!.label}
                hint={tool!.hint}
                priority={index + 1}
                variant="overview"
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionHeader title={peopleTitle} body={peopleBody} />
        <div className="grid gap-3 md:grid-cols-12">
          {delegates ? (
            <FeaturedToolLink tool={delegates} emphasis="primary" className="md:col-span-5 md:row-span-2" />
          ) : null}
          <div className="grid gap-3 md:col-span-7">
            {notes ? (
              <FeaturedToolLink tool={notes} emphasis="secondary" className="md:min-h-[7rem]" />
            ) : null}
            {speechNotes ? (
              <FeaturedToolLink
                tool={speechNotes}
                emphasis="secondary"
                className="md:translate-x-0 md:min-h-[7rem] lg:ml-8"
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
