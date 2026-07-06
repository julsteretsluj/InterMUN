// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SessionControlClient } from "@/app/(dashboard)/chair/session/SessionControlClient";

const SessionControlClientLazy = dynamic(
  () =>
    import("@/app/(dashboard)/chair/session/SessionControlClient").then(
      (m) => m.SessionControlClient
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-white/15 bg-black/25 p-6 text-sm text-brand-muted"
        role="status"
        aria-live="polite"
      >
        Loading session floor…
      </div>
    ),
  }
);

export function ChairSessionControlLoader(props: ComponentProps<typeof SessionControlClient>) {
  return <SessionControlClientLazy {...props} />;
}
