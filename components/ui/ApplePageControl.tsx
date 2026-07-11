// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";

type ApplePageControlProps = {
  pageCount: number;
  currentPage: number;
  onPageChange?: (page: number) => void;
  maxVisibleDots?: number;
  className?: string;
  "aria-label"?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDotScale(index: number, currentPage: number, pageCount: number, maxVisibleDots: number) {
  if (pageCount <= maxVisibleDots) return 1;

  const distance = Math.abs(index - currentPage);
  if (distance === 0) return 1;
  if (distance === 1) return 0.82;
  if (distance === 2) return 0.62;
  if (distance === 3) return 0.46;
  return 0.34;
}

export function ApplePageControl({
  pageCount,
  currentPage,
  onPageChange,
  maxVisibleDots = 7,
  className,
  "aria-label": ariaLabel,
}: ApplePageControlProps) {
  const safeCount = Math.max(0, pageCount);
  const safeCurrent = clamp(currentPage, 0, Math.max(0, safeCount - 1));

  if (safeCount <= 1) return null;

  return (
    <nav className={cn("mun-apple-page-control", className)} aria-label={ariaLabel}>
      <div className="mun-apple-page-control-track" role="tablist">
        {Array.from({ length: safeCount }, (_, index) => {
          const isCurrent = index === safeCurrent;
          const scale = getDotScale(index, safeCurrent, safeCount, maxVisibleDots);
          const interactive = Boolean(onPageChange) && index <= safeCurrent;

          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-label={`Page ${index + 1} of ${safeCount}`}
              disabled={!interactive}
              onClick={interactive ? () => onPageChange?.(index) : undefined}
              className={cn(
                "mun-apple-page-control-dot",
                isCurrent && "is-current",
                interactive && "is-interactive"
              )}
              style={{ transform: `scale(${scale})` }}
            />
          );
        })}
      </div>
    </nav>
  );
}
