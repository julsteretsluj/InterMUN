// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MunPageShell } from "@/components/MunPageShell";
import { ChairSessionControlLoader } from "@/components/chair/ChairSessionControlLoader";
import { SessionFloorNoCommittee } from "@/app/(dashboard)/chair/session/SessionFloorNoCommittee";
import type { ChairSessionConference } from "@/app/(dashboard)/chair/session/loadChairSession";
import { resolveChairSessionFloorRoute } from "@/lib/chair-session-floor-route";

/**
 * Persistent session-floor host: stays mounted across Speakers/Motions/Timer/etc.
 * so tab clicks only change `activeSection` instead of remounting + refetching.
 */
export function ChairSessionFloorShell({
  conference,
}: {
  conference: ChairSessionConference | null;
}) {
  const pathname = usePathname() || "";
  const tPage = useTranslations("pageTitles");
  const tDiscipline = useTranslations("chairMotionsPointsLog");
  const route = useMemo(() => resolveChairSessionFloorRoute(pathname), [pathname]);

  if (!route) return null;

  const title =
    route.titleKey === "discipline"
      ? tDiscipline("disciplinarySystem")
      : tPage(route.titleKey);

  if (!conference) {
    return (
      <MunPageShell
        title={title}
        variant={route.shellVariant === "flush" ? "split" : route.shellVariant}
      >
        <SessionFloorNoCommittee />
      </MunPageShell>
    );
  }

  return (
    <MunPageShell title={title} variant={route.shellVariant}>
      <ChairSessionControlLoader
        {...conference}
        activeSection={route.section}
        initialTimerWorkflowTab={route.timerTab}
        initialSpeakersWorkflowTab={route.speakersTab}
      />
    </MunPageShell>
  );
}
