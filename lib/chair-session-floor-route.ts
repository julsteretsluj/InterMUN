// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type {
  SessionFloorSection,
  SpeakersWorkflowTab,
  TimerWorkflowTab,
} from "@/app/(dashboard)/chair/session/SessionControlClient";

export type ChairSessionFloorRoute = {
  section: Exclude<SessionFloorSection, "all">;
  /** pageTitles key, or discipline (uses chairMotionsPointsLog.disciplinarySystem). */
  titleKey:
    | "speakers"
    | "openingSpeech"
    | "formalMotions"
    | "committeeAgenda"
    | "rollCallTracker"
    | "timer"
    | "speechNotes"
    | "announcements"
    | "discipline";
  shellVariant: "flush" | "offset" | "default";
  timerTab?: TimerWorkflowTab;
  speakersTab?: SpeakersWorkflowTab;
};

/**
 * Map /chair/session/* tool URLs to the shared floor client section.
 * Used so a persistent layout can switch tabs without remounting.
 */
export function resolveChairSessionFloorRoute(pathname: string): ChairSessionFloorRoute | null {
  const path = (pathname.split("?")[0] || pathname).replace(/\/+$/, "") || pathname;

  if (path.endsWith("/speech-notes")) {
    return {
      section: "timer",
      titleKey: "speechNotes",
      shellVariant: "offset",
      timerTab: "notes",
    };
  }
  if (path.endsWith("/timer")) {
    return { section: "timer", titleKey: "timer", shellVariant: "flush" };
  }
  if (path.endsWith("/opening-speech")) {
    return {
      section: "speakers",
      titleKey: "openingSpeech",
      shellVariant: "flush",
      speakersTab: "opening",
    };
  }
  if (path.endsWith("/speakers")) {
    return {
      section: "speakers",
      titleKey: "speakers",
      shellVariant: "flush",
      speakersTab: "queue",
    };
  }
  if (path.endsWith("/motions")) {
    return { section: "motions", titleKey: "formalMotions", shellVariant: "offset" };
  }
  if (path.endsWith("/agenda")) {
    return { section: "agenda", titleKey: "committeeAgenda", shellVariant: "flush" };
  }
  if (path.endsWith("/roll-call")) {
    return { section: "roll-call", titleKey: "rollCallTracker", shellVariant: "offset" };
  }
  if (path.endsWith("/announcements")) {
    return { section: "announcements", titleKey: "announcements", shellVariant: "offset" };
  }
  if (path.endsWith("/discipline")) {
    return { section: "discipline", titleKey: "discipline", shellVariant: "flush" };
  }
  if (path.endsWith("/timer")) {
    return { section: "timer", titleKey: "timer", shellVariant: "offset" };
  }
  return null;
}
