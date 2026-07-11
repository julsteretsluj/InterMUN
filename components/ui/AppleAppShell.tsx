// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { AppleNotificationProvider } from "@/components/ui/AppleNotification";
import { AppleSystemChrome } from "@/components/ui/AppleStatusBar";
import { AppleWindow } from "@/components/ui/AppleWindow";
import { GlassCanvas } from "@/components/ui/GlassCanvas";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppleAppProviders({ children }: { children: ReactNode }) {
  return (
    <AppleNotificationProvider>
      <AppleSiteShell>{children}</AppleSiteShell>
    </AppleNotificationProvider>
  );
}

/** Ambient glass canvas + Apple typography context for every route. */
export function AppleSiteShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <GlassCanvas className={cn("mun-apple-site min-h-full", className)}>
      {children}
    </GlassCanvas>
  );
}

export type AppleLayoutMode = "minimal" | "content" | "chrome";

type AppleLayoutWrapperProps = {
  children: ReactNode;
  appName: string;
  mode?: AppleLayoutMode;
  title?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AppleLayoutWrapper({
  children,
  appName,
  mode = "minimal",
  title,
  subtitle,
  className,
  contentClassName,
}: AppleLayoutWrapperProps) {
  const body = (
    <div className={cn("mun-apple-page-body", contentClassName)}>{children}</div>
  );

  if (mode === "minimal") {
    return <div className={cn("mun-apple-layout-minimal", className)}>{body}</div>;
  }

  const window = (
    <AppleWindow
      resizable={mode === "chrome"}
      showControls={mode === "chrome"}
      title={title}
      subtitle={subtitle}
      className={mode === "content" ? className : undefined}
      contentClassName={cn("mun-apple-page-body", contentClassName)}
    >
      {children}
    </AppleWindow>
  );

  if (mode === "content") {
    return window;
  }

  return (
    <AppleSystemChrome appLabel={appName} appHref="/" menuItems={[]} className={className}>
      {window}
    </AppleSystemChrome>
  );
}

/** macOS menu bar + status chrome for app surfaces (dashboard, marketing, admin). */
export function AppleAppFrame({
  children,
  appName,
  appHref = "/",
  className,
}: {
  children: ReactNode;
  appName: string;
  appHref?: string;
  className?: string;
}) {
  return (
    <AppleSystemChrome appLabel={appName} appHref={appHref} menuItems={[]} className={className}>
      {children}
    </AppleSystemChrome>
  );
}
