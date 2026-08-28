// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initialsFromLabel(label: string): string {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function ChairDelegateAvatar({
  name,
  profilePictureUrl,
  size = "md",
  className,
}: {
  name: string;
  profilePictureUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const url = profilePictureUrl?.trim() || "";
  const showImage = Boolean(url) && !broken;
  const initials = initialsFromLabel(name || "?");
  const sizeClass =
    size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-8 w-8 text-[0.65rem]" : "h-10 w-10 text-xs";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-white/80 dark:ring-zinc-800",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#007AFF] font-bold text-white ring-2 ring-white/80 dark:ring-zinc-800",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
