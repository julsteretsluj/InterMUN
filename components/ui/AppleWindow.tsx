// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AppleWindowControlsProps = {
  className?: string;
  showMore?: boolean;
  moreLabel?: string;
  onMore?: () => void;
};

export function AppleWindowControls({
  className,
  showMore = false,
  moreLabel = "More options",
  onMore,
}: AppleWindowControlsProps) {
  return (
    <div className={cn("mun-apple-window-controls", className)} aria-hidden={!showMore}>
      <span className="mun-apple-window-traffic mun-apple-window-traffic-close" />
      <span className="mun-apple-window-traffic mun-apple-window-traffic-minimize" />
      <span className="mun-apple-window-traffic mun-apple-window-traffic-zoom" />
      {showMore ? (
        <button type="button" className="mun-apple-window-more" aria-label={moreLabel} onClick={onMore}>
          <Ellipsis className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

type AppleWindowTitlebarProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  showControls?: boolean;
  showMore?: boolean;
  moreLabel?: string;
  onMore?: () => void;
  className?: string;
};

export function AppleWindowTitlebar({
  title,
  subtitle,
  leading,
  trailing,
  showControls = true,
  showMore = false,
  moreLabel,
  onMore,
  className,
}: AppleWindowTitlebarProps) {
  return (
    <header className={cn("mun-apple-window-titlebar border-b border-[var(--hairline)] bg-[var(--dashboard-card)]", className)}>
      <div className="mun-apple-window-titlebar-leading">
        {leading ?? (showControls ? <AppleWindowControls showMore={showMore} moreLabel={moreLabel} onMore={onMore} /> : null)}
      </div>
      <div className="mun-apple-window-titlebar-center">
        {title ? <div className="mun-apple-window-title">{title}</div> : null}
        {subtitle ? <div className="mun-apple-window-subtitle">{subtitle}</div> : null}
      </div>
      <div className="mun-apple-window-titlebar-trailing">{trailing ?? <span className="mun-apple-window-titlebar-slot" aria-hidden />}</div>
    </header>
  );
}

type AppleWindowProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  resizable?: boolean;
  showControls?: boolean;
  showMore?: boolean;
  moreLabel?: string;
  onMore?: () => void;
  trailing?: ReactNode;
};

export function AppleWindow({
  title,
  subtitle,
  children,
  footer,
  className,
  contentClassName,
  resizable = true,
  showControls = true,
  showMore = false,
  moreLabel,
  onMore,
  trailing,
}: AppleWindowProps) {
  return (
    <section className={cn("mun-apple-window rounded-2xl border border-[var(--hairline)] bg-[var(--dashboard-card)] shadow-[var(--dashboard-shadow)]", className)}>
      {title || subtitle || showControls ? (
        <AppleWindowTitlebar
          title={title}
          subtitle={subtitle}
          showControls={showControls}
          showMore={showMore}
          moreLabel={moreLabel}
          onMore={onMore}
          trailing={trailing}
        />
      ) : null}
      <div className={cn("mun-apple-window-content", contentClassName)}>{children}</div>
      {footer ? <div className="mun-apple-window-footer">{footer}</div> : null}
      {resizable ? <span className="mun-apple-window-resize" aria-hidden /> : null}
    </section>
  );
}

type AppleWindowWithSidebarProps = Omit<AppleWindowProps, "children"> & {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarClassName?: string;
  showSidebar?: boolean;
};

export function AppleWindowWithSidebar({
  sidebar,
  children,
  sidebarClassName,
  showSidebar = true,
  contentClassName,
  ...windowProps
}: AppleWindowWithSidebarProps) {
  return (
    <AppleWindow {...windowProps} contentClassName={cn("mun-apple-window-content-split", contentClassName)}>
      {showSidebar ? (
        <div className={cn("mun-apple-window-sidebar flex flex-col bg-[color:color-mix(in_srgb,var(--dashboard-cream)_62%,white)]", sidebarClassName)}>{sidebar}</div>
      ) : null}
      <div className="mun-apple-window-main">{children}</div>
    </AppleWindow>
  );
}
