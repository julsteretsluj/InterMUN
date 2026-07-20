// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { FeatureGuideLink } from "@/components/guides/FeatureGuideLink";
import { isGuideRole, type GuideRole } from "@/lib/guides-curriculum";
import type { GuideFeatureId } from "@/lib/guides-feature-links";

/** Server-friendly wrapper around FeatureGuideLink with role fallback. */
export function PageFeatureGuideLink({
  featureId,
  role,
}: {
  featureId: GuideFeatureId;
  role?: string | null;
}) {
  const guideRole: GuideRole = isGuideRole(role?.toLowerCase())
    ? (role!.toLowerCase() as GuideRole)
    : "delegate";
  return <FeatureGuideLink featureId={featureId} role={guideRole} />;
}
