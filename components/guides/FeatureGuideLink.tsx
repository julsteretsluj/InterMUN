// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  resolveFeatureGuideHref,
  type GuideFeatureId,
} from "@/lib/guides-feature-links";
import type { GuideRole } from "@/lib/guides-curriculum";
import { cn } from "@/lib/utils";

export function FeatureGuideLink({
  featureId,
  role,
  className,
  label,
}: {
  featureId: GuideFeatureId;
  role: GuideRole;
  className?: string;
  label?: string;
}) {
  const t = useTranslations("guides");
  const { href } = resolveFeatureGuideHref(featureId, role);
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline",
        className
      )}
    >
      {label ?? t("openFullGuide")}
    </Link>
  );
}
