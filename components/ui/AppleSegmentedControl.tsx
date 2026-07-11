// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";

export type AppleSegmentedControlItem = {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type AppleSegmentedControlProps = {
  items: AppleSegmentedControlItem[];
  value: string | null;
  onValueChange: (id: string) => void;
  className?: string;
  size?: "regular" | "compact";
  "aria-label"?: string;
};

export function AppleSegmentedControl({
  items,
  value,
  onValueChange,
  className,
  size = "regular",
  "aria-label": ariaLabel,
}: AppleSegmentedControlProps) {
  if (items.length < 2) return null;

  const selectedIndex = value ? items.findIndex((item) => item.id === value) : -1;
  const showIndicator = selectedIndex >= 0;

  return (
    <div
      className={cn(
        "mun-apple-segmented-control",
        size === "compact" && "mun-apple-segmented-control-compact",
        className
      )}
      role="tablist"
      aria-label={ariaLabel}
      style={
        {
          "--segment-count": items.length,
          "--segment-index": Math.max(0, selectedIndex),
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden
        className={cn("mun-apple-segmented-control-indicator", !showIndicator && "is-hidden")}
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            onClick={() => onValueChange(item.id)}
            className={cn(
              "mun-apple-segmented-control-segment",
              selected && "is-selected",
              item.disabled && "is-disabled"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
