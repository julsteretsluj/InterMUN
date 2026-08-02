// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Marketing emphasis — Inter italic via `.mun-emph` (same family as the rest of the UI). */
export function MarketingEmph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("mun-emph", className)}>{children}</span>;
}
