// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

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
  titleAside?: React.ReactNode;
  variant?: MunPageShellVariant;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mun-page-shell space-y-5 p-5 md:p-6",
        variant === "offset" && "md:ml-2 md:mt-1",
        variant === "split" && "space-y-6",
        variant === "flush" && "!p-4 md:!p-5",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-end justify-between gap-x-4 gap-y-2",
          variant === "split" && "border-b border-[var(--clicky-line)] pb-4"
        )}
      >
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--clicky-ink-faint)]">
            workspace
          </p>
          <h2 className="mt-1 font-sans !mb-0 text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--clicky-ink)] md:text-[1.55rem]">
            {title}
          </h2>
        </div>
        {titleAside ? <div className="shrink-0">{titleAside}</div> : null}
      </div>
      {children}
    </section>
  );
}
