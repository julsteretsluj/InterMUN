// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { HawkinsClockSlot } from "@/components/fwc/HawkinsClockSlot";

export default function FwcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HawkinsClockSlot />
      {children}
    </>
  );
}
