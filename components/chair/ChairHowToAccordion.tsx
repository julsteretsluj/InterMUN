"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChairHowToAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-zinc-100"
      >
        How to use this system (Chair)
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-zinc-700 dark:text-zinc-300">
          <p>
            Your committee data (allocations, roll call, votes, timers) lives in InterMUN and syncs for signed-in
            users. Prep and flow checklists, plus the quick motions log on this device, are stored in your browser for
            that committee only—clear site data if you need a fresh start.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-slate-900 dark:text-zinc-100">Digital Room</strong> — placard list
              with roll status plus private compliment/concern/reminder flags (saved in this browser).
            </li>
            <li>
              <strong className="font-medium text-slate-900 dark:text-zinc-100">Delegates</strong> — use the matrix to
              assign countries; delegates join with the room and gate codes you set.
            </li>
            <li>
              <strong className="font-medium text-slate-900 dark:text-zinc-100">Session</strong> — roll call, speakers,
              announcements, timer, and formal motions with chair-recorded votes.
            </li>
            <li>
              <strong className="font-medium text-slate-900 dark:text-zinc-100">Motions &amp; Points</strong> — informal
              scratch log; switch to Session → Motions for procedural votes and the motion floor.
            </li>
            <li>
              <strong className="font-medium text-slate-900 dark:text-zinc-100">Voting</strong> — delegate-facing vote
              view; chairs record placards in Session.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
