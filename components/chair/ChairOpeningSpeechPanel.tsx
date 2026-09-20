// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ListOrdered, Mic2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useConferenceTimer } from "@/lib/use-conference-timer";
import {
  OPENING_SPEECH_EXTENDED_SECONDS,
  OPENING_SPEECH_SECONDS,
  isOpeningSpeechFloorLabel,
  openingSpeechSecondsFromFloorLabel,
  setupOpeningSpeeches,
} from "@/lib/opening-speech";
import {
  ChairSpeakerQueuePanel,
  type SpeakerListChairPromptKind,
} from "@/components/chair/ChairSpeakerQueuePanel";

type Alloc = { id: string; country: string; userRole?: string | null };

type ChairOpeningSpeechPanelProps = {
  conferenceId: string;
  allocations: Alloc[];
  isEuParliament?: boolean;
  isCrisisCommittee?: boolean;
  /** When true (dedicated route), auto-build the A–Z list once on mount. */
  autoSetupOnMount?: boolean;
  /** Embed the shared speaker queue panel (dedicated tab). Off when Speakers is already shown. */
  includeSpeakerQueue?: boolean;
  speakerListPromptKind?: SpeakerListChairPromptKind | null;
  onDismissSpeakerListPrompt?: () => void;
  onNotify?: (text: string) => void;
};

const CARD =
  "rounded-xl border border-[var(--hairline)] bg-[var(--dashboard-card)] p-4 text-brand-navy shadow-sm backdrop-blur-sm";

export function ChairOpeningSpeechPanel({
  conferenceId,
  allocations,
  isEuParliament = false,
  isCrisisCommittee = false,
  autoSetupOnMount = false,
  includeSpeakerQueue = true,
  speakerListPromptKind = null,
  onDismissSpeakerListPrompt,
  onNotify,
}: ChairOpeningSpeechPanelProps) {
  const t = useTranslations("chairOpeningSpeechPanel");
  const supabase = createClient();
  const { timer: liveTimer, remaining } = useConferenceTimer(conferenceId, null, true);
  const [pending, startTransition] = useTransition();
  const autoRan = useRef(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const notify = (text: string) => {
    setLocalMsg(text);
    onNotify?.(text);
  };

  const speechSeconds = isOpeningSpeechFloorLabel(liveTimer?.floor_label)
    ? openingSpeechSecondsFromFloorLabel(liveTimer?.floor_label)
    : liveTimer?.total_time_seconds && liveTimer.total_time_seconds >= OPENING_SPEECH_EXTENDED_SECONDS
      ? OPENING_SPEECH_EXTENDED_SECONDS
      : OPENING_SPEECH_SECONDS;
  const isExtended = speechSeconds >= OPENING_SPEECH_EXTENDED_SECONDS;

  function beginOpeningSpeeches(seconds: number = OPENING_SPEECH_SECONDS) {
    startTransition(async () => {
      const result = await setupOpeningSpeeches(supabase, conferenceId, allocations, {
        isCrisisCommittee,
        speechSeconds: seconds,
        existingTimer: liveTimer,
        setFirstCurrent: true,
      });
      if (!result.ok) {
        notify(result.message);
        return;
      }
      notify(
        result.skipped > 0
          ? t("setupDoneWithSkipped", {
              count: result.count,
              seconds,
              skipped: result.skipped,
            })
          : t("setupDone", { count: result.count, seconds })
      );
    });
  }

  useEffect(() => {
    if (!autoSetupOnMount || autoRan.current) return;
    if (allocations.length === 0) return;
    // Only auto-fill when the list is empty / not already in opening-speech mode.
    void (async () => {
      const { count } = await supabase
        .from("speaker_queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("conference_id", conferenceId)
        .in("status", ["waiting", "current"]);
      const alreadyOpening = isOpeningSpeechFloorLabel(liveTimer?.floor_label);
      if ((count ?? 0) > 0) {
        autoRan.current = true;
        return;
      }
      if (alreadyOpening) {
        autoRan.current = true;
        return;
      }
      autoRan.current = true;
      beginOpeningSpeeches(OPENING_SPEECH_SECONDS);
    })();
    // Wait until allocations are loaded so auto-setup is not a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-setup once allocations arrive
  }, [autoSetupOnMount, conferenceId, allocations.length]);

  return (
    <section className="space-y-4">
      <div className={`${CARD} space-y-3`}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/15 text-[#007AFF]">
            <Mic2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-sans text-lg font-semibold tracking-tight text-brand-navy">
              {t("title")}
            </h3>
            <p className="text-sm text-brand-muted">{t("intro")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--apple-bg-secondary)] px-3 py-2 text-sm text-brand-navy">
          <ListOrdered className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden />
          <span>
            {t("statusLabel")}{" "}
            <strong className="font-semibold tabular-nums">
              {isExtended
                ? t("statusExtended", { seconds: OPENING_SPEECH_EXTENDED_SECONDS })
                : t("statusDefault", { seconds: OPENING_SPEECH_SECONDS })}
            </strong>
            {liveTimer ? (
              <>
                {" · "}
                {t("clockRemaining", {
                  clock: `${Math.floor(Math.max(0, remaining) / 60)}:${String(
                    Math.max(0, Math.round(remaining)) % 60
                  ).padStart(2, "0")}`,
                })}
              </>
            ) : null}
          </span>
        </div>

        <p className="text-sm text-brand-muted">
          {t("extendHintPrefix")}{" "}
          <Link
            href="/chair/session/motions"
            className="font-medium text-[#007AFF] underline decoration-[#007AFF]/35 underline-offset-2 hover:text-[#0077ED]"
          >
            {t("extendMotionName")}
          </Link>{" "}
          {t("extendHintSuffix", { seconds: OPENING_SPEECH_EXTENDED_SECONDS })}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => beginOpeningSpeeches(OPENING_SPEECH_SECONDS)}
            className="rounded-[980px] bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0077ED] disabled:opacity-50"
          >
            {pending ? t("settingUp") : t("beginButton")}
          </button>
        </div>

        {localMsg ? (
          <p className="rounded-lg border border-[var(--hairline)] bg-[var(--apple-bg-secondary)] px-3 py-2 text-sm text-brand-navy">
            {localMsg}
          </p>
        ) : null}
      </div>

      {includeSpeakerQueue ? (
        <ChairSpeakerQueuePanel
          conferenceId={conferenceId}
          allocations={allocations}
          variant="session"
          isEuParliament={isEuParliament}
          isCrisisCommittee={isCrisisCommittee}
          speakerListPromptKind={speakerListPromptKind}
          onDismissSpeakerListPrompt={onDismissSpeakerListPrompt}
          onNotify={onNotify}
        />
      ) : null}
    </section>
  );
}
