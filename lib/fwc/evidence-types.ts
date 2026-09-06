// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export type FwcEvidenceMonitorRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  startingLocation: string;
  discoverableBy: string;
  tacticalEffect: string;
  isSecret: boolean;
  found: boolean;
  currentLocation: string;
  heldByAllocationId: string | null;
  foundByAllocationId: string | null;
  foundAt: string | null;
  notes: string;
};

export type FwcEvidenceHolder = {
  id: string;
  country: string;
};

export type FwcEvidenceSourceMeta = {
  filename: string;
  publicUrl: string | null;
  uploadedAt: string | null;
};

export type FwcEvidenceLibraryPayload = {
  canonicalConferenceId: string;
  items: FwcEvidenceMonitorRow[];
  holders: FwcEvidenceHolder[];
  source: FwcEvidenceSourceMeta | null;
};
