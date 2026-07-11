// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppleActivityContact = {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  badge?: ReactNode;
  onSelect: () => void;
};

export type AppleActivityShortcut = {
  id: string;
  label: string;
  icon: ReactNode;
  /** App-icon tile tint (CSS color). */
  tint?: string;
  onSelect: () => void;
};

export type AppleActivityQuickAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};

export type AppleActivityListAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};

type AppleActivityViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  preview?: ReactNode;
  metaLabel?: string;
  metaHint?: string;
  contacts?: AppleActivityContact[];
  shortcuts?: AppleActivityShortcut[];
  quickActions?: AppleActivityQuickAction[];
  listActions?: AppleActivityListAction[];
  editActionsLabel?: string;
  onEditActions?: () => void;
  closeLabel?: string;
  className?: string;
};

export function AppleActivityView({
  open,
  onOpenChange,
  title,
  subtitle,
  preview,
  metaLabel,
  metaHint,
  contacts = [],
  shortcuts = [],
  quickActions = [],
  listActions = [],
  editActionsLabel,
  onEditActions,
  closeLabel = "Close",
  className,
}: AppleActivityViewProps) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function close() {
    onOpenChange(false);
  }

  function runAction(action: () => void) {
    action();
    close();
  }

  const hasContacts = contacts.length > 0;
  const hasShortcuts = shortcuts.length > 0;
  const hasQuickActions = quickActions.length > 0;
  const hasListActions = listActions.length > 0;

  return createPortal(
    <div className={cn("mun-apple-activity-root", className)}>
      <button type="button" className="mun-apple-activity-scrim" aria-label={closeLabel} onClick={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className="mun-apple-activity-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mun-apple-activity-header">
          <div className="mun-apple-activity-preview" aria-hidden>
            {preview ?? <span className="mun-apple-activity-preview-fallback">{title.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="mun-apple-activity-header-copy">
            <h2 id={titleId} className="mun-apple-activity-title">
              {title}
            </h2>
            {subtitle ? (
              <p id={subtitleId} className="mun-apple-activity-subtitle">
                {subtitle}
              </p>
            ) : null}
            {metaLabel ? (
              <div className="mun-apple-activity-meta">
                <span className="mun-apple-activity-meta-pill">{metaLabel}</span>
                {metaHint ? <span className="mun-apple-activity-meta-hint">{metaHint}</span> : null}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={close} className="mun-apple-activity-close" aria-label={closeLabel}>
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </header>

        {hasContacts ? (
          <div className="mun-apple-activity-scroll-row" role="list" aria-label={title}>
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                role="listitem"
                onClick={() => runAction(contact.onSelect)}
                className="mun-apple-activity-contact"
              >
                <span className="mun-apple-activity-contact-avatar">
                  {contact.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contact.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    contact.initials ?? contact.name.slice(0, 2).toUpperCase()
                  )}
                  {contact.badge ? <span className="mun-apple-activity-contact-badge">{contact.badge}</span> : null}
                </span>
                <span className="mun-apple-activity-contact-name">{contact.name}</span>
              </button>
            ))}
          </div>
        ) : null}

        {hasShortcuts ? (
          <div className="mun-apple-activity-scroll-row mun-apple-activity-shortcuts" role="list">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                role="listitem"
                onClick={() => runAction(shortcut.onSelect)}
                className="mun-apple-activity-shortcut"
              >
                <span
                  className="mun-apple-activity-shortcut-icon"
                  style={shortcut.tint ? { background: shortcut.tint } : undefined}
                >
                  {shortcut.icon}
                </span>
                <span className="mun-apple-activity-shortcut-label">{shortcut.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {hasQuickActions ? (
          <div className="mun-apple-activity-scroll-row mun-apple-activity-quick-actions" role="list">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="listitem"
                onClick={() => runAction(action.onSelect)}
                className="mun-apple-activity-quick-action"
              >
                <span className="mun-apple-activity-quick-action-icon">{action.icon}</span>
                <span className="mun-apple-activity-quick-action-label">{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {hasListActions ? (
          <section className="mun-apple-activity-list-group">
            {listActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => runAction(action.onSelect)}
                className="mun-apple-activity-list-action"
              >
                <span className="mun-apple-activity-list-action-icon" aria-hidden>
                  {action.icon}
                </span>
                <span className="mun-apple-activity-list-action-label">{action.label}</span>
              </button>
            ))}
          </section>
        ) : null}

        {editActionsLabel && onEditActions ? (
          <footer className="mun-apple-activity-footer">
            <button type="button" onClick={onEditActions} className="mun-apple-activity-edit-actions">
              {editActionsLabel}
            </button>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
