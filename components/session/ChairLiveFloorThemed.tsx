"use client";

import { useEffect, useState } from "react";
import { ChairLiveFloor } from "@/components/session/ChairLiveFloor";

function isDocDark() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Syncs `ChairLiveFloor` `theme` with the `html.dark` class (theme toggle). */
export function ChairLiveFloorThemed({
  conferenceId,
  canonicalConferenceId,
  siblingConferenceIds,
  observeFloorOnly = false,
}: {
  conferenceId: string;
  canonicalConferenceId: string;
  siblingConferenceIds: string[];
  observeFloorOnly?: boolean;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(isDocDark());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return (
    <ChairLiveFloor
      conferenceId={conferenceId}
      canonicalConferenceId={canonicalConferenceId}
      siblingConferenceIds={siblingConferenceIds}
      theme={dark ? "dark" : "light"}
      observeFloorOnly={observeFloorOnly}
    />
  );
}
