// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ComponentProps } from "react";
import { SessionControlClient } from "@/app/(dashboard)/chair/session/SessionControlClient";

/**
 * Thin wrapper kept for call-site stability. Direct import avoids the
 * `dynamic(..., { ssr: false })` waterfall that delayed first floor paint.
 */
export function ChairSessionControlLoader(props: ComponentProps<typeof SessionControlClient>) {
  return <SessionControlClient {...props} />;
}
