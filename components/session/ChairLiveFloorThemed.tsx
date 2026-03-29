"use client";

import { useEffect, useState } from "react";
import { ChairLiveFloor } from "@/components/session/ChairLiveFloor";

function isDocDark() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

/** Syncs `ChairLiveFloor` `theme` with the `html.dark` class (theme toggle). */
export function ChairLiveFloorThemed({
  conferenceId,
  observeFloorOnly = false,
}: {
  conferenceId: string;
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
      theme={dark ? "dark" : "light"}
      observeFloorOnly={observeFloorOnly}
    />
  );
}
