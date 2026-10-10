// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { normalizeProcedureProfile, type ProcedureProfile } from "@/lib/procedure-profiles";
import { FWC_SEAMUN_I_2027_ROP } from "@/lib/rop/fwc-seamun-i-2027";
import type { CommitteeRopConfig } from "@/lib/rop/types";

/**
 * Procedure profiles backed by a data-driven RoP config. Profiles without an entry keep the
 * legacy hard-coded behaviour in `motion-disruptiveness` / `rop-required-majority`.
 */
const ROP_CONFIG_BY_PROFILE: Partial<Record<ProcedureProfile, CommitteeRopConfig>> = {
  fwc_crisis: FWC_SEAMUN_I_2027_ROP,
};

export function getRopConfig(profile: ProcedureProfile | string | null | undefined): CommitteeRopConfig | null {
  return ROP_CONFIG_BY_PROFILE[normalizeProcedureProfile(profile)] ?? null;
}

export const FWC_ROP = FWC_SEAMUN_I_2027_ROP;

export type { CommitteeRopConfig } from "@/lib/rop/types";
