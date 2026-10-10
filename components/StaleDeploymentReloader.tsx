// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reloads tabs left running an old deployment's JS (a stale tab looped REST reads
 * for a day after a fix shipped). Polls the CDN-served `/api/version` only — never
 * Supabase — at a low rate with error backoff, then reloads at a safe moment.
 */

const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "";
const POLL_MS = 5 * 60_000;
const POLL_MAX_MS = 30 * 60_000;
const FOCUS_MIN_GAP_MS = 60_000;
const IDLE_BEFORE_RELOAD_MS = 2 * 60_000;
const RELOADED_FOR_KEY = "intermun-stale-reload-for";

function editableFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function alreadyReloadedFor(id: string): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED_FOR_KEY) === id;
  } catch {
    return false;
  }
}

export function StaleDeploymentReloader() {
  const pathname = usePathname();
  const staleIdRef = useRef<string | null>(null);
  const lastPathRef = useRef(pathname);

  const reload = () => {
    const id = staleIdRef.current;
    if (!id || alreadyReloadedFor(id)) return;
    try {
      window.sessionStorage.setItem(RELOADED_FOR_KEY, id);
    } catch {
      /* private mode */
    }
    window.location.reload();
  };
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Navigating away is the safest moment: the user is leaving this view anyway.
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (staleIdRef.current) reloadRef.current();
  }, [pathname]);

  useEffect(() => {
    if (!BUILD_ID) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setInterval> | null = null;
    let delay = POLL_MS;
    let lastCheckAt = 0;
    let lastActivityAt = Date.now();
    let checking = false;

    const markActivity = () => {
      lastActivityAt = Date.now();
    };

    const tryReloadWhenSafe = () => {
      if (!staleIdRef.current) return;
      if (document.visibilityState === "hidden") {
        reloadRef.current();
        return;
      }
      if (editableFocused()) return;
      if (Date.now() - lastActivityAt < IDLE_BEFORE_RELOAD_MS) return;
      reloadRef.current();
    };

    const markStale = (id: string) => {
      if (alreadyReloadedFor(id)) return;
      staleIdRef.current = id;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
      idleTimer = setInterval(tryReloadWhenSafe, 30_000);
      tryReloadWhenSafe();
    };

    const schedule = () => {
      if (cancelled || staleIdRef.current) return;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = setTimeout(() => void check(), delay);
    };

    const check = async () => {
      if (cancelled || checking || staleIdRef.current) return;
      checking = true;
      lastCheckAt = Date.now();
      try {
        const res = await fetch("/api/version", {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { id?: unknown };
        const id = typeof body.id === "string" ? body.id : "";
        delay = POLL_MS;
        if (id && id !== BUILD_ID) markStale(id);
      } catch {
        delay = Math.min(POLL_MAX_MS, delay * 2);
      } finally {
        checking = false;
        schedule();
      }
    };

    const onVisibleOrFocus = () => {
      if (staleIdRef.current) {
        tryReloadWhenSafe();
        return;
      }
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastCheckAt < Math.max(FOCUS_MIN_GAP_MS, delay - POLL_MS)) return;
      void check();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") tryReloadWhenSafe();
      else onVisibleOrFocus();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibleOrFocus);
    window.addEventListener("keydown", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("input", markActivity, { passive: true });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (idleTimer) clearInterval(idleTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibleOrFocus);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("input", markActivity);
    };
  }, []);

  return null;
}
