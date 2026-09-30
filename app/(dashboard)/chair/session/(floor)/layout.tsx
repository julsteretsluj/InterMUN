// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { ChairSessionFloorShell } from "@/components/chair/ChairSessionFloorShell";
import { loadChairSessionConferenceCached } from "../loadChairSession";

/**
 * Shared floor layout: mounts SessionControlClient once and keeps it alive across
 * Speakers / Motions / Timer / etc. Child pages are URL anchors only.
 */
export default async function ChairSessionFloorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const conference = await loadChairSessionConferenceCached();
  return (
    <>
      <ChairSessionFloorShell conference={conference} />
      {children}
    </>
  );
}
