// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type ApplePageIntroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Registration-style page header (eyebrow, title, subtitle). */
export function ApplePageIntro({ eyebrow, title, subtitle, footer, className }: ApplePageIntroProps) {
  return (
    <header className={cn("mun-apple-page-intro", className)}>
      {eyebrow ? (
        <p className="mun-apple-text mun-apple-text-caption-2-emphasized uppercase tracking-[0.22em] text-[var(--accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mun-apple-text mun-apple-text-large-title-emphasized">{title}</h1>
      {subtitle ? (
        <p className="mun-apple-text mun-apple-text-body mun-vibrancy-secondary max-w-2xl">{subtitle}</p>
      ) : null}
      {footer ? <div className="mun-apple-text mun-apple-text-subheadline">{footer}</div> : null}
    </header>
  );
}

type AppleProductPageProps = {
  children: ReactNode;
  /** Narrow centered column like secretariat registration (default). */
  width?: "narrow" | "wide" | "full";
  className?: string;
};

export function AppleProductPage({ children, width = "narrow", className }: AppleProductPageProps) {
  return (
    <div
      className={cn(
        "mun-apple-product-page",
        width === "narrow" && "mun-apple-product-page-narrow",
        width === "wide" && "mun-apple-product-page-wide",
        className
      )}
    >
      {children}
    </div>
  );
}
