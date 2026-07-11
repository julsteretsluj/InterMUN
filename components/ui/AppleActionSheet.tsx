// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type AppleActionSheetAction = {
  id: string;
  label: string;
  role?: "default" | "destructive";
  onSelect: () => void;
};

type AppleActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  actions: AppleActionSheetAction[];
  cancelLabel?: string;
  className?: string;
};

export function AppleActionSheet({
  open,
  onOpenChange,
  title,
  message,
  actions,
  cancelLabel = "Cancel",
  className,
}: AppleActionSheetProps) {
  const titleId = useId();
  const messageId = useId();
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

  function handleAction(action: AppleActionSheetAction) {
    action.onSelect();
    close();
  }

  return createPortal(
    <div className={cn("mun-apple-action-sheet-root", className)}>
      <button
        type="button"
        className="mun-apple-action-sheet-scrim"
        aria-label={cancelLabel}
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
        className="mun-apple-action-sheet-stack"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <section className="mun-apple-action-sheet-group">
          <header className="mun-apple-action-sheet-header">
            <h2 id={titleId} className="mun-apple-action-sheet-title">
              {title}
            </h2>
            {message ? (
              <p id={messageId} className="mun-apple-action-sheet-message">
                {message}
              </p>
            ) : null}
          </header>
          <div className="mun-apple-action-sheet-actions" role="group" aria-label={title}>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action)}
                className={cn(
                  "mun-apple-action-sheet-action",
                  action.role === "destructive" && "mun-apple-action-sheet-action-destructive"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
        <section className="mun-apple-action-sheet-group mun-apple-action-sheet-cancel-group">
          <button type="button" onClick={close} className="mun-apple-action-sheet-action">
            {cancelLabel}
          </button>
        </section>
      </div>
    </div>,
    document.body
  );
}
