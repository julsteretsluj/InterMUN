// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export type AppleWidgetSize = "small" | "medium" | "large" | "extraLarge";
export type AppleLockWidgetVariant = "circular" | "rectangular" | "inline";

type AppleWidgetGridProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

export function AppleWidgetGrid({ children, className, "aria-label": ariaLabel }: AppleWidgetGridProps) {
  return (
    <section className={cn("mun-apple-widget-grid", className)} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

type AppleWidgetProps = {
  size?: AppleWidgetSize;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  tint?: string;
  children?: ReactNode;
  className?: string;
};

export function AppleWidget({
  size = "medium",
  title,
  subtitle,
  footer,
  tint,
  children,
  className,
}: AppleWidgetProps) {
  return (
    <article
      className={cn("mun-apple-widget", `mun-apple-widget-${size}`, className)}
      style={tint ? ({ "--widget-tint": tint } as CSSProperties) : undefined}
    >
      <div className="mun-apple-widget-body">
        {title ? <h3 className="mun-apple-widget-title">{title}</h3> : null}
        {subtitle ? <p className="mun-apple-widget-subtitle">{subtitle}</p> : null}
        {children ? <div className="mun-apple-widget-content">{children}</div> : null}
      </div>
      {footer ? <footer className="mun-apple-widget-footer">{footer}</footer> : null}
    </article>
  );
}

type AppleWidgetProgressProps = {
  value: number;
  max: number;
  label?: ReactNode;
};

export function AppleWidgetProgress({ value, max, label }: AppleWidgetProgressProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className="mun-apple-widget-progress">
      <div className="mun-apple-widget-progress-track" aria-hidden>
        <span className="mun-apple-widget-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {label ? <p className="mun-apple-widget-progress-label">{label}</p> : null}
    </div>
  );
}

type AppleWidgetRingProps = {
  value: number;
  max: number;
  label?: ReactNode;
};

export function AppleWidgetRing({ value, max, label }: AppleWidgetRingProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className="mun-apple-widget-ring"
      style={{ "--ring-progress": `${percent}%` } as CSSProperties}
      aria-hidden={!label}
      aria-label={typeof label === "string" ? label : undefined}
    >
      <span className="mun-apple-widget-ring-value">
        {value}
        <span className="mun-apple-widget-ring-max">/{max}</span>
      </span>
    </div>
  );
}

type AppleLockScreenWidgetProps = {
  variant?: AppleLockWidgetVariant;
  label?: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AppleLockScreenWidget({
  variant = "rectangular",
  label,
  value,
  meta,
  children,
  className,
}: AppleLockScreenWidgetProps) {
  return (
    <article
      className={cn(
        "mun-apple-lock-widget",
        variant === "circular" && "mun-apple-lock-widget-circular",
        variant === "inline" && "mun-apple-lock-widget-inline",
        className
      )}
    >
      {variant === "inline" ? (
        <p className="mun-apple-lock-widget-inline-text">
          {label}
          {value ? <span className="mun-apple-lock-widget-inline-value">{value}</span> : null}
          {meta ? <span className="mun-apple-lock-widget-inline-meta">{meta}</span> : null}
        </p>
      ) : (
        <>
          {value ? <div className="mun-apple-lock-widget-value">{value}</div> : null}
          {label ? <p className="mun-apple-lock-widget-label">{label}</p> : null}
          {meta ? <p className="mun-apple-lock-widget-meta">{meta}</p> : null}
          {children}
        </>
      )}
    </article>
  );
}
