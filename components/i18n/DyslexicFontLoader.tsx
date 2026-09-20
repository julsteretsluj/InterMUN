// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useRef } from "react";

let loadPromise: Promise<void> | null = null;

function loadDyslexicFonts(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    import("@fontsource/opendyslexic/latin-400.css"),
    import("@fontsource/opendyslexic/latin-700.css"),
    import("@fontsource/atkinson-hyperlegible/latin-400.css"),
    import("@fontsource/atkinson-hyperlegible/latin-700.css"),
  ]).then(() => undefined);
  return loadPromise;
}

/**
 * Loads OpenDyslexic / Atkinson only when `html.dyslexic-font` is present,
 * so the default path does not pay for those webfonts.
 */
export function DyslexicFontLoader() {
  const loadedRef = useRef(false);

  useEffect(() => {
    const ensure = () => {
      if (!document.documentElement.classList.contains("dyslexic-font")) return;
      if (loadedRef.current) return;
      loadedRef.current = true;
      void loadDyslexicFonts();
    };

    ensure();
    const obs = new MutationObserver(ensure);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return null;
}
