// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  DelayedLoadingOverlay,
  DEFAULT_LOADING_DELAY_MS,
} from "@/components/ui/DelayedLoadingOverlay";
import {
  endNavigationLoading,
  getNavigationLoadingPending,
  subscribeNavigationLoading,
} from "@/lib/navigation-loading";

const STUCK_NAV_TIMEOUT_MS = 20_000;

function useProgrammaticNavigationPending() {
  return useSyncExternalStore(
    subscribeNavigationLoading,
    getNavigationLoadingPending,
    () => false
  );
}

function clearProgrammaticPending() {
  while (getNavigationLoadingPending()) endNavigationLoading();
}

function sameAppUrl(href: string, pathname: string, search: string) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    return url.pathname === pathname && url.search === search;
  } catch {
    return false;
  }
}

function isModifiedClick(event: MouseEvent) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function NavigationLoadingListenerInner() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const routeKey = `${pathname}${search}`;

  const [linkPending, setLinkPending] = useState(false);
  const programmaticPending = useProgrammaticNavigationPending();
  const stuckTimerRef = useRef<number | null>(null);

  const pending = linkPending || programmaticPending;

  // Settle immediately when the URL updates.
  useEffect(() => {
    setLinkPending(false);
    clearProgrammaticPending();
    if (stuckTimerRef.current != null) {
      window.clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, [routeKey]);

  useEffect(() => {
    if (!pending) {
      if (stuckTimerRef.current != null) {
        window.clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
      return;
    }
    stuckTimerRef.current = window.setTimeout(() => {
      setLinkPending(false);
      clearProgrammaticPending();
      stuckTimerRef.current = null;
    }, STUCK_NAV_TIMEOUT_MS);
    return () => {
      if (stuckTimerRef.current != null) {
        window.clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };
  }, [pending]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (sameAppUrl(href, pathname, search)) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }

      setLinkPending(true);
    };

    const onPopState = () => {
      setLinkPending(true);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [pathname, search]);

  return (
    <DelayedLoadingOverlay
      active={pending}
      delayMs={DEFAULT_LOADING_DELAY_MS}
      label="Loading"
      variant="overlay"
    />
  );
}

/** Suspense boundary required for `useSearchParams` in the App Router. */
export function NavigationLoadingListener() {
  return (
    <Suspense fallback={null}>
      <NavigationLoadingListenerInner />
    </Suspense>
  );
}
