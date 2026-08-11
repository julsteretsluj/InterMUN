// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { CrisisNotesPack } from "@/lib/crisis-notes-prompts";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-base font-semibold tracking-[-0.01em] text-brand-navy dark:text-zinc-50">
      {children}
    </h3>
  );
}

function NoteBlock({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-xl border border-brand-line/70 bg-white/70 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h4 className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-brand-muted dark:text-zinc-300">{body}</p>
    </article>
  );
}

export function CrisisNotesPromptsView({ pack }: { pack: CrisisNotesPack }) {
  return (
    <div className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <p className="text-sm text-brand-muted dark:text-zinc-400">
          Chair cues for{" "}
          <span className="font-medium text-brand-navy dark:text-zinc-100">{pack.chamberLabel}</span>
          <span className="text-brand-muted"> · </span>
          <span className="font-medium text-brand-navy dark:text-zinc-100">{pack.formatLabel}</span>
        </p>
        <p className="text-[0.95rem] leading-snug text-brand-navy/90 dark:text-zinc-200">
          <span className="font-semibold">Agenda:</span> {pack.topicLabel}
        </p>
        {pack.subjectTags.length > 0 ? (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label="Subject tags">
            {pack.subjectTags.map((tag) => (
              <li
                key={tag}
                className="rounded-md border border-brand-line/80 bg-[#EDF8FF]/90 px-2 py-0.5 text-xs font-medium text-[#35516B] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <section className="space-y-3">
        <SectionHeading>Committee notes</SectionHeading>
        <div className="space-y-2.5">
          {pack.briefing.map((item) => (
            <NoteBlock key={item.id} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>Crisis prompts</SectionHeading>
        <p className="text-sm text-brand-muted dark:text-zinc-400">
          Drop these when debate stalls or you need a timed decision.
        </p>
        <div className="space-y-2.5">
          {pack.prompts.map((item) => (
            <NoteBlock key={item.id} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>Pathways</SectionHeading>
        <p className="text-sm text-brand-muted dark:text-zinc-400">
          Sketch routes the room might take so you can steer without railroading.
        </p>
        <div className="space-y-2.5">
          {pack.pathways.map((item) => (
            <NoteBlock key={item.id} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading>
          {pack.formatLabel === "Character crisis" ? "Character cues" : "Seat cues"}
        </SectionHeading>
        {pack.seatPrompts.length === 0 ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-brand-navy dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            No seats allocated yet. Once the matrix has countries or characters, per-seat prompts will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {pack.seatPrompts.map((row) => (
              <li
                key={row.seat}
                className="rounded-xl border border-brand-line/70 bg-gradient-to-br from-white/80 to-[#F8FBFF]/90 px-4 py-3 dark:border-white/10 dark:from-white/[0.05] dark:to-transparent"
              >
                <p className="text-sm font-semibold text-brand-navy dark:text-zinc-100">{row.seat}</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-brand-muted dark:text-zinc-300">
                  {row.prompts.map((prompt) => (
                    <li key={prompt}>{prompt}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
