// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Brand mark wrapper — opening orb replay removed. */
export function OrbPlayTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}
