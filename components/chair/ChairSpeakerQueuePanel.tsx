"use client";

import { forwardRef, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DAIS_SEAT_CO_CHAIR, DAIS_SEAT_HEAD_CHAIR } from "@/lib/allocation-display-order";
import {
  activeAllocationIdsInQueue,
  addAllocationToSpeakerQueue,
  fetchSpeakerQueue,
  type SpeakerQueueEntry,
} from "@/lib/speaker-queue";

type Alloc = { id: string; country: string; userRole?: string | null };

/** Session: chair reminder to curate the speaker list (add / remove delegates). */
export type SpeakerListChairPromptKind = "moderated_passed" | "moderated_timer" | "gsl";

type ChairSpeakerQueuePanelProps = {
  conferenceId: string;
  allocations: Alloc[];
  variant: "session" | "digital-room";
  /** Crisis committees keep crisis actor seats even when linked to chair-role accounts. */
  isCrisisCommittee?: boolean;
  speakerListPromptKind?: SpeakerListChairPromptKind | null;
  onDismissSpeakerListPrompt?: () => void;
  /** Session page: surface feedback in the shared message strip. */
  onNotify?: (text: string) => void;
};

const SESSION_CARD =
  "rounded-xl border border-white/15 bg-black/25 p-3 text-brand-navy shadow-sm backdrop-blur-sm";
const SESSION_LABEL = "text-xs font-medium uppercase tracking-wide text-brand-muted";
const SESSION_INPUT_CORE =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-brand-navy shadow-inner placeholder:text-brand-muted/60 focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/40";
const SESSION_FIELD = `mt-1 ${SESSION_INPUT_CORE}`;

export const ChairSpeakerQueuePanel = forwardRef<HTMLElement, ChairSpeakerQueuePanelProps>(
  function ChairSpeakerQueuePanel(
    {
      conferenceId,
      allocations,
      variant,
      isCrisisCommittee = false,
      speakerListPromptKind = null,
      onDismissSpeakerListPrompt,
      onNotify,
    },
    ref
  ) {
    const supabase = useMemo(() => createClient(), []);
    const [queue, setQueue] = useState<SpeakerQueueEntry[]>([]);
    const [pickAlloc, setPickAlloc] = useState("");
    const [caucusBulkPick, setCaucusBulkPick] = useState<string[]>([]);
    const [localFeedback, setLocalFeedback] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const notify = useCallback(
      (text: string) => {
        if (onNotify) onNotify(text);
        else setLocalFeedback(text);
      },
      [onNotify]
    );

    const loadQueue = useCallback(async () => {
      try {
        const rows = await fetchSpeakerQueue(supabase, conferenceId);
        setQueue(rows);
      } catch {
        setQueue([]);
      }
    }, [supabase, conferenceId]);

    useEffect(() => {
      void loadQueue();
    }, [loadQueue]);

    useEffect(() => {
      const ch = supabase
        .channel(`chair-speaker-queue-${conferenceId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "speaker_queue_entries" },
          () => void loadQueue()
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(ch);
      };
    }, [supabase, conferenceId, loadQueue]);

    const activeQueueAllocationIds = useMemo(() => activeAllocationIdsInQueue(queue), [queue]);
    const speakerAllocations = useMemo(() => {
      return allocations.filter((alloc) => {
        const label = alloc.country?.trim() ?? "";
        const key = label.toLowerCase();
        const isDaisSeat =
          key === DAIS_SEAT_HEAD_CHAIR.toLowerCase() ||
          key === DAIS_SEAT_CO_CHAIR.toLowerCase() ||
          key === "co chair";
        if (isDaisSeat) return false;

        const role = alloc.userRole?.toString().trim().toLowerCase();
        if (role === "chair") {
          // Crisis actors can be chair-role accounts with non-dais allocations.
          return isCrisisCommittee;
        }
        return true;
      });
    }, [allocations, isCrisisCommittee]);
    const sortedQueue = useMemo(
      () => [...queue].sort((a, b) => a.sort_order - b.sort_order),
      [queue]
    );

    function toggleCaucusBulkPick(allocationId: string) {
      setCaucusBulkPick((prev) =>
        prev.includes(allocationId) ? prev.filter((x) => x !== allocationId) : [...prev, allocationId]
      );
    }

    function addSpeaker() {
      if (!pickAlloc) return;
      const a = speakerAllocations.find((x) => x.id === pickAlloc);
      if (!a) return;
      startTransition(async () => {
        const rows = await fetchSpeakerQueue(supabase, conferenceId);
        const result = await addAllocationToSpeakerQueue(
          supabase,
          conferenceId,
          a.id,
          a.country,
          rows
        );
        notify(result.ok ? "Added to speaker list." : result.message);
        void loadQueue();
      });
    }

    function addBulkSelectedToQueue() {
      const toAdd = speakerAllocations
        .map((x) => x.id)
        .filter((id) => caucusBulkPick.includes(id) && !activeQueueAllocationIds.has(id));
      if (!toAdd.length) {
        notify("Choose delegations that are not already waiting or current on the list.");
        return;
      }
      startTransition(async () => {
        let rows = await fetchSpeakerQueue(supabase, conferenceId);
        for (let i = 0; i < toAdd.length; i++) {
          const id = toAdd[i]!;
          const alloc = speakerAllocations.find((x) => x.id === id);
          const result = await addAllocationToSpeakerQueue(
            supabase,
            conferenceId,
            id,
            alloc?.country ?? "—",
            rows
          );
          if (!result.ok) {
            notify(result.message);
            void loadQueue();
            return;
          }
          rows = await fetchSpeakerQueue(supabase, conferenceId);
        }
        notify(`Added ${toAdd.length} speaker(s) in committee list order.`);
        setCaucusBulkPick([]);
        void loadQueue();
      });
    }

    function removeQueue(id: string) {
      startTransition(async () => {
        await supabase.from("speaker_queue_entries").delete().eq("id", id);
        void loadQueue();
      });
    }

    function setCurrent(id: string) {
      startTransition(async () => {
        const rows = await fetchSpeakerQueue(supabase, conferenceId);
        const existingCurrent = rows.find((r) => r.status === "current");
        if (existingCurrent?.id && existingCurrent.id !== id) {
          await supabase.from("speaker_queue_entries").update({ status: "waiting" }).eq("id", existingCurrent.id);
        }
        await supabase.from("speaker_queue_entries").update({ status: "current" }).eq("id", id);
        void loadQueue();
      });
    }

    function moveRow(id: string, dir: "up" | "down") {
      const sorted = [...queue].sort((a, b) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= sorted.length) return;
      const a = sorted[idx]!;
      const b = sorted[j]!;
      const oa = a.sort_order;
      const ob = b.sort_order;
      startTransition(async () => {
        await supabase.from("speaker_queue_entries").update({ sort_order: ob }).eq("id", a.id);
        await supabase.from("speaker_queue_entries").update({ sort_order: oa }).eq("id", b.id);
        void loadQueue();
      });
    }

    const isSession = variant === "session";
    const headingClass = isSession
      ? "font-display text-lg font-semibold text-brand-navy"
      : "font-display text-lg font-semibold text-slate-900 dark:text-zinc-50";
    const cardClass = isSession
      ? SESSION_CARD
      : "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80";
    const labelClass = isSession ? SESSION_LABEL : "text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400";
    const fieldClass = isSession
      ? SESSION_FIELD
      : "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";
    const addButtonClass = isSession
      ? "px-4 py-2 rounded-lg border border-white/25 bg-white/10 text-brand-navy text-sm font-medium hover:bg-white/20 disabled:opacity-50"
      : "rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";
    const rowBorder = isSession ? "border-b border-white/12" : "border-b border-slate-200/80 dark:border-zinc-700/80";

    return (
      <section ref={ref} className="space-y-3">
        <div>
          <h3 className={headingClass}>🎤 Speaker list</h3>
          <p
            className={`mt-1 text-sm ${
              isSession ? "text-brand-muted" : "text-slate-600 dark:text-zinc-400"
            }`}
          >
            Add delegations in speaking order. Delegates can still use{" "}
            <span
              className={
                isSession ? "font-medium text-brand-navy" : "font-medium text-slate-800 dark:text-zinc-200"
              }
            >
              Request to speak
            </span>{" "}
            in the committee room. Use{" "}
            <Link
              href="/chair/session/timer"
              className={
                isSession
                  ? "font-medium text-brand-accent-bright underline decoration-brand-accent-bright/40 underline-offset-2"
                  : "font-medium text-brand-diplomatic underline decoration-brand-diplomatic/35 underline-offset-2 dark:text-brand-accent-bright"
              }
            >
              Session → Timer
            </Link>{" "}
            for per-speaker time and <strong className="font-medium">Advance speaker</strong>.
          </p>
        </div>

        {!isSession && localFeedback ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200">
            {localFeedback}
          </p>
        ) : null}

        <div className={`${cardClass} space-y-3`}>
          {isSession && speakerListPromptKind ? (
            <div className="rounded-lg border-2 border-amber-500/80 bg-amber-50 p-3 space-y-3 text-brand-navy dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-50">
              <div className="flex gap-2 items-start">
                <ListOrdered className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    {speakerListPromptKind === "gsl"
                      ? "General Speakers' List (GSL)"
                      : speakerListPromptKind === "moderated_timer"
                        ? "Moderated caucus (per-speaker timer)"
                        : "Moderated caucus passed"}
                  </p>
                  <p className="text-sm text-brand-navy/85 dark:text-amber-100/90">
                    Use the speaker list below to <strong className="font-medium">add</strong> delegates (dropdown +
                    <strong className="font-medium"> Add</strong>, or tick delegations and{" "}
                    <strong className="font-medium">Add selected to list</strong>) and{" "}
                    <strong className="font-medium">remove</strong> them with <strong className="font-medium">Remove</strong>{" "}
                    on each row. Reorder with the arrows or set <strong className="font-medium">Current</strong> when someone
                    is at the mic.
                  </p>
                </div>
              </div>
              {speakerAllocations.length === 0 ? (
                <p className="text-sm text-brand-muted dark:text-amber-200/80">
                  No allocations are loaded for this committee yet. Dismiss when ready—you can add speakers later from
                  the list controls.
                </p>
              ) : speakerAllocations.some((a) => !activeQueueAllocationIds.has(a.id)) ? (
                <div className="space-y-2">
                  <p className={`${labelClass} text-brand-muted dark:text-amber-200/70`}>
                    Quick add (not yet waiting or current)
                  </p>
                  <ul className="max-h-40 overflow-y-auto rounded border border-amber-200/80 bg-black/40 p-2 space-y-1.5 text-sm dark:border-amber-800/50 dark:bg-black/30">
                    {speakerAllocations.map((a) => {
                      if (activeQueueAllocationIds.has(a.id)) return null;
                      const checked = caucusBulkPick.includes(a.id);
                      return (
                        <li key={a.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleCaucusBulkPick(a.id)} />
                            <span>{a.country}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending || caucusBulkPick.length === 0}
                      onClick={addBulkSelectedToQueue}
                      className="px-3 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
                    >
                      Add selected to list
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        onDismissSpeakerListPrompt?.();
                        setCaucusBulkPick([]);
                      }}
                      className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                      Dismiss reminder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-brand-muted dark:text-amber-200/80">
                    Every allocation already has a waiting or current slot. Remove entries if you need to reorder, or
                    dismiss when you are done.
                  </p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      onDismissSpeakerListPrompt?.();
                      setCaucusBulkPick([]);
                    }}
                    className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    Dismiss reminder
                  </button>
                </div>
              )}
              {speakerAllocations.length === 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onDismissSpeakerListPrompt?.();
                    setCaucusBulkPick([]);
                  }}
                  className="px-3 py-2 rounded-lg border border-white/20 bg-black/25 text-brand-navy text-sm font-medium hover:bg-black/20 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  Dismiss reminder
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 items-end">
            <label className={`text-sm flex-1 min-w-[12rem] ${isSession ? "text-brand-navy" : "text-slate-800 dark:text-zinc-200"}`}>
              <span className={labelClass}>Add delegation</span>
              <select
                className={fieldClass}
                value={pickAlloc}
                onChange={(e) => setPickAlloc(e.target.value)}
              >
                <option value="">Select…</option>
                {speakerAllocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.country}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={pending} onClick={addSpeaker} className={addButtonClass}>
              Add
            </button>
          </div>

          <ul className={`space-y-2 ${isSession ? "text-brand-navy" : "text-slate-900 dark:text-zinc-100"}`}>
            {sortedQueue.map((q, pos) => (
                <li
                  key={q.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2 ${rowBorder}`}
                >
                  <span className="font-medium">
                    {q.label || "—"}{" "}
                    <span
                      className={
                        isSession
                          ? "text-xs font-normal text-brand-muted"
                          : "text-xs font-normal text-slate-500 dark:text-zinc-400"
                      }
                    >
                      ({q.status})
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 sm:gap-2">
                    <button
                      type="button"
                      disabled={pending || pos <= 0}
                      className={
                        isSession
                          ? "p-1.5 rounded-md text-brand-navy/80 hover:bg-white/10 disabled:opacity-30"
                          : "p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }
                      title="Move up"
                      aria-label="Move up"
                      onClick={() => moveRow(q.id, "up")}
                    >
                      <ChevronUp className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      disabled={pending || pos >= sortedQueue.length - 1}
                      className={
                        isSession
                          ? "p-1.5 rounded-md text-brand-navy/80 hover:bg-white/10 disabled:opacity-30"
                          : "p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }
                      title="Move down"
                      aria-label="Move down"
                      onClick={() => moveRow(q.id, "down")}
                    >
                      <ChevronDown className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={`text-xs font-medium hover:underline ${isSession ? "text-amber-700 dark:text-amber-400" : "text-amber-800 dark:text-amber-400"}`}
                      onClick={() => setCurrent(q.id)}
                    >
                      Current
                    </button>
                    <button
                      type="button"
                      className={`text-xs font-medium hover:underline ${isSession ? "text-red-700 dark:text-red-300" : "text-red-700 dark:text-red-400"}`}
                      onClick={() => removeQueue(q.id)}
                    >
                      Remove
                    </button>
                  </span>
                </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
);
