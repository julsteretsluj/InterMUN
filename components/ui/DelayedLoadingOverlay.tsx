// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_LOADING_DELAY_MS = 1000;

/** True only after `active` has stayed true for `delayMs` (hides immediately when inactive). */
export function useDelayedVisible(active: boolean, delayMs = DEFAULT_LOADING_DELAY_MS) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);

  return visible;
}

type DelayedLoadingUiProps = {
  label?: string;
  className?: string;
};

function LoadingMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-9 rounded-full border-2 border-[#D1D1D6] border-t-[#1D1D1F]",
        "animate-spin [animation-duration:0.85s]",
        className
      )}
      aria-hidden
    />
  );
}

/** Calm Apple-HIG loading panel (grouped gray). */
export function DelayedLoadingPanel({
  label = "Loading",
  className,
}: DelayedLoadingUiProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[16px] bg-[#F2F2F7] px-8 py-10 text-[#1D1D1F]",
        "shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      <LoadingMark />
      <p className="text-sm font-medium tracking-[-0.01em] text-[#1D1D1F]">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}

type DelayedLoadingOverlayProps = DelayedLoadingUiProps & {
  /** When true, start the delay timer; hide immediately when false. */
  active: boolean;
  delayMs?: number;
  /** `overlay` = fixed on top of current UI; `inline` = fills the Suspense slot. */
  variant?: "overlay" | "inline";
};

/**
 * Shared delayed loader. Does not paint until `delayMs` (default 1s) so fast
 * navigations never flash. Hides as soon as `active` becomes false.
 */
export function DelayedLoadingOverlay({
  active,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  label = "Loading",
  variant = "overlay",
  className,
}: DelayedLoadingOverlayProps) {
  const visible = useDelayedVisible(active, delayMs);
  if (!visible) return null;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[var(--content-max-width,82.5rem)] items-center justify-center px-4 py-16 sm:px-8",
          className
        )}
      >
        <DelayedLoadingPanel label={label} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center",
        "bg-[color-mix(in_srgb,#F2F2F7_72%,transparent)] backdrop-blur-[2px]",
        "transition-opacity duration-300 ease-[var(--ease-apple,cubic-bezier(0.25,0.1,0.25,1))]",
        className
      )}
    >
      <DelayedLoadingPanel label={label} />
    </div>
  );
}

/**
 * For `loading.tsx`: mounts as active, shows calm UI only after the delay.
 * Returns null until then so fast suspensions do not flicker.
 */
export function DelayedRouteLoading({
  label = "Loading",
  delayMs = DEFAULT_LOADING_DELAY_MS,
  className,
}: DelayedLoadingUiProps & { delayMs?: number }) {
  return (
    <DelayedLoadingOverlay
      active
      delayMs={delayMs}
      label={label}
      variant="inline"
      className={className}
    />
  );
}

/** Optional helper for heavy client actions that already expose a pending flag. */
export function DelayedPendingGate({
  pending,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  label,
  variant = "overlay",
  children,
}: {
  pending: boolean;
  delayMs?: number;
  label?: string;
  variant?: "overlay" | "inline";
  children?: ReactNode;
}) {
  return (
    <>
      {children}
      <DelayedLoadingOverlay
        active={pending}
        delayMs={delayMs}
        label={label}
        variant={variant}
      />
    </>
  );
}
