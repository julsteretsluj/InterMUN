// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Viewport-locked 3-pane workspace:
 * left sidebar · center canvas · optional context rail.
 * Mobile collapses to canvas + bottom dock (passed as `mobileDock`).
 */
export function WorkspaceShell({
  sidebar,
  topBar,
  contextRail,
  mobileDock,
  children,
  className,
  sidebarCollapsed = false,
}: {
  sidebar: ReactNode;
  topBar: ReactNode;
  contextRail?: ReactNode;
  mobileDock?: ReactNode;
  children: ReactNode;
  className?: string;
  /** When true, sidebar stays icon-rail width (desktop). */
  sidebarCollapsed?: boolean;
}) {
  return (
    <div
      className={cn(
        "mun-workspace-shell mun-clicky-site flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[var(--clicky-paper)] text-[var(--clicky-ink)] lg:p-3",
        className
      )}
    >
      <div
        className={cn(
          "dashboard-app-frame flex min-h-0 w-full min-w-0 flex-1 flex-col bg-[var(--clicky-window)]",
          "lg:flex-row lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-[var(--clicky-line)]",
          "lg:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
        )}
      >
        <aside
          data-workspace-pane="sidebar"
          className={cn(
            "group relative z-30 hidden shrink-0 flex-col overflow-hidden border-r border-[var(--clicky-line)]",
            "bg-[color:color-mix(in_srgb,var(--clicky-paper)_78%,transparent)] backdrop-blur-md",
            "transition-[width] duration-500 ease-[var(--ease-apple)] lg:flex",
            sidebarCollapsed
              ? "lg:w-[92px]"
              : "lg:w-[92px] lg:hover:w-[236px]"
          )}
        >
          {sidebar}
        </aside>

        <div
          data-workspace-pane="main"
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--clicky-paper)]"
        >
          {topBar}
          <div className="flex min-h-0 min-w-0 flex-1">
            <main
              data-tour="tour-main"
              data-workspace-pane="canvas"
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-8 md:py-8 lg:pb-8"
            >
              {children}
            </main>
            {contextRail ? (
              <aside
                data-workspace-pane="context"
                className="hidden w-[min(20rem,28vw)] shrink-0 overflow-y-auto overscroll-contain border-l border-[var(--clicky-line)] bg-[color:color-mix(in_srgb,var(--dashboard-card)_72%,transparent)] backdrop-blur-md xl:block"
              >
                {contextRail}
              </aside>
            ) : null}
          </div>
        </div>
      </div>

      {mobileDock ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 lg:hidden">
          {mobileDock}
        </div>
      ) : null}
    </div>
  );
}
