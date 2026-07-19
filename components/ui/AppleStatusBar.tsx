// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type AppleStatusBarProps = {
  variant?: "iphone" | "ipad" | "auto";
  className?: string;
};

function formatIphoneTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatIpadStatus(date: Date) {
  return date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StatusCellularIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("mun-apple-status-icon mun-apple-status-icon-cellular", className)} viewBox="0 0 17 11" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="currentColor" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill="currentColor" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function StatusWifiIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("mun-apple-status-icon mun-apple-status-icon-wifi", className)} viewBox="0 0 15 11" aria-hidden>
      <path
        d="M7.5 10.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
        fill="currentColor"
      />
      <path
        d="M4.6 7.05a4.35 4.35 0 0 1 5.8 0l-.95 1.05a3.05 3.05 0 0 0-3.9 0l-.95-1.05Z"
        fill="currentColor"
      />
      <path
        d="M1.65 4.1a8.25 8.25 0 0 1 11.7 0l-.95 1.05a6.95 6.95 0 0 0-9.8 0L1.65 4.1Z"
        fill="currentColor"
      />
      <path
        d="M0 1.15A11.15 11.15 0 0 1 15 1.15l-.95 1.05a9.85 9.85 0 0 0-13.1 0L0 1.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StatusBatteryIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("mun-apple-status-icon mun-apple-status-icon-battery", className)} viewBox="0 0 25 11" aria-hidden>
      <rect x="0.75" y="0.75" width="20.5" height="9.5" rx="2.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="22.75" y="3.25" width="1.5" height="4.5" rx="0.75" fill="currentColor" />
      <rect x="2.25" y="2.25" width="16.5" height="6.5" rx="1.25" fill="currentColor" />
    </svg>
  );
}

function StatusIndicators({ showCellular = false, showBatteryLabel = false }: { showCellular?: boolean; showBatteryLabel?: boolean }) {
  return (
    <span className="mun-apple-status-bar-indicators">
      {showCellular ? <StatusCellularIcon /> : null}
      <StatusWifiIcon />
      {showBatteryLabel ? <span className="mun-apple-status-bar-battery-label">100%</span> : null}
      <StatusBatteryIcon />
    </span>
  );
}

const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;
let clockMs = 0;

function subscribeClock(onStoreChange: () => void) {
  clockListeners.add(onStoreChange);
  if (clockTimer == null) {
    clockMs = Date.now();
    clockTimer = setInterval(() => {
      clockMs = Date.now();
      clockListeners.forEach((listener) => listener());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(onStoreChange);
    if (clockListeners.size === 0 && clockTimer != null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

/**
 * Server snapshot is null so SSR renders no time text — the real,
 * locale-correct time fills in on the client. This avoids hydration
 * mismatches from server/client clock and locale differences.
 */
function useStatusClock(): Date | null {
  const ms = useSyncExternalStore(subscribeClock, () => clockMs, () => 0);
  return ms === 0 ? null : new Date(ms);
}

export function AppleStatusBar({ variant = "auto", className }: AppleStatusBarProps) {
  const now = useStatusClock();
  const showIpadRow = variant !== "iphone";

  return (
    // aria-live="off": the clock re-renders every 30s and must not be announced each time.
    <div className={cn("mun-apple-status-bar", className)} role="status" aria-live="off">
      <div className="mun-apple-status-bar-iphone flex md:hidden">
        <time className="mun-apple-status-bar-time" dateTime={now?.toISOString()}>
          {now ? formatIphoneTime(now) : "\u00a0"}
        </time>
        <span className="mun-apple-status-bar-island" aria-hidden />
        <StatusIndicators showCellular />
      </div>
      {showIpadRow ? (
        <div className="mun-apple-status-bar-ipad hidden md:flex">
          <time className="mun-apple-status-bar-datetime" dateTime={now?.toISOString()}>
            {now ? formatIpadStatus(now) : "\u00a0"}
          </time>
          <StatusIndicators showBatteryLabel />
        </div>
      ) : null}
    </div>
  );
}

export type AppleMenuBarItem = {
  id: string;
  label: string;
  onSelect?: () => void;
  href?: string;
  active?: boolean;
  disabled?: boolean;
};

type AppleMenuBarProps = {
  appLabel: string;
  appHref?: string;
  items: AppleMenuBarItem[];
  className?: string;
  showSystemStatus?: boolean;
};

function AppleMenuBarStatus() {
  const now = useStatusClock();

  return (
    <div className="mun-apple-menu-bar-status" aria-hidden>
      <time className="mun-apple-status-bar-datetime" dateTime={now?.toISOString()}>
        {now ? formatIpadStatus(now) : "\u00a0"}
      </time>
      <StatusIndicators showBatteryLabel />
    </div>
  );
}

export function AppleMenuBar({ appLabel, appHref = "/", items, className, showSystemStatus = true }: AppleMenuBarProps) {
  return (
    <div className={cn("mun-apple-menu-bar hidden md:flex", className)} role="menubar" aria-label={appLabel}>
      <a href={appHref} className="mun-apple-menu-bar-app" role="menuitem">
        {appLabel}
      </a>
      {items.map((item) =>
        item.href ? (
          <a
            key={item.id}
            href={item.href}
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            className={cn("mun-apple-menu-bar-item", item.active && "is-active", item.disabled && "is-disabled")}
          >
            {item.label}
          </a>
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={item.onSelect}
            className={cn("mun-apple-menu-bar-item", item.active && "is-active", item.disabled && "is-disabled")}
          >
            {item.label}
          </button>
        )
      )}
      <span className="mun-apple-menu-bar-spacer" aria-hidden />
      {showSystemStatus ? <AppleMenuBarStatus /> : null}
    </div>
  );
}

type AppleSystemChromeProps = {
  appLabel: string;
  appHref?: string;
  menuItems: AppleMenuBarItem[];
  children: React.ReactNode;
  className?: string;
};

export function AppleSystemChrome({ appLabel, appHref, menuItems, children, className }: AppleSystemChromeProps) {
  return (
    <div className={cn("mun-apple-system-chrome", className)}>
      <AppleStatusBar />
      <AppleMenuBar appLabel={appLabel} appHref={appHref} items={menuItems} />
      {children}
    </div>
  );
}
