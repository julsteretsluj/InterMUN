// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/utils";

export type MunPageShellVariant = "default" | "offset" | "split" | "flush";

export function MunPageShell({
  title,
  children,
  titleAside,
  variant = "default",
  className,
}: {
  title: string;
  children: React.ReactNode;
  /** Optional actions / guide link beside the page title. */
  titleAside?: React.ReactNode;
  /** Composition rhythm so adjacent hubs don’t clone each other. */
  variant?: MunPageShellVariant;
  className?: string;
}) {
  return (
    <GlassPanel
      className={cn(
        "mun-page-shell space-y-4",
        variant === "offset" && "mun-page-shell-offset",
        variant === "split" && "mun-page-shell-split",
        variant === "flush" && "mun-page-shell-flush !p-4 md:!p-5",
        className
      )}
      material={variant === "flush" ? "thin" : "regular"}
      interactive={false}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
          variant === "split" && "border-b border-[var(--hairline)] pb-3"
        )}
      >
        <h2 className="font-sans !mb-0 text-[1.35rem] font-semibold tracking-[-0.015em] text-brand-navy md:text-[1.6rem]">
          {title}
        </h2>
        {titleAside ? <div className="shrink-0">{titleAside}</div> : null}
      </div>
      {children}
    </GlassPanel>
  );
}
