// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Formerly played a full-screen opening orb on first visit.
 * Kept as a passthrough so marketing/auth call sites stay stable.
 */
export function MarketingOpening({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
