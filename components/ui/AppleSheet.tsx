// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppleSheetDetent = "medium" | "large" | "full";

type AppleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  detent?: AppleSheetDetent;
  grabber?: boolean;
  closeLabel?: string;
  trailingAction?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AppleSheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  detent = "medium",
  grabber = true,
  closeLabel = "Close",
  trailingAction,
  className,
  contentClassName,
}: AppleSheetProps) {
  const titleId = useId();
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

  return createPortal(
    <div className={cn("mun-apple-sheet-root", className)}>
      <button type="button" className="mun-apple-sheet-scrim" aria-label={closeLabel} onClick={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-detent={detent}
        className={cn("mun-apple-sheet-panel", `mun-apple-sheet-panel-${detent}`)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {grabber ? <div className="mun-apple-sheet-grabber-wrap" aria-hidden><span className="mun-apple-sheet-grabber" /></div> : null}
        <header className="mun-apple-sheet-header">
          <button type="button" className="mun-apple-sheet-close" aria-label={closeLabel} onClick={close}>
            <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
          <h2 id={titleId} className="mun-apple-sheet-title">
            {title}
          </h2>
          <div className="mun-apple-sheet-trailing">{trailingAction ?? <span aria-hidden />}</div>
        </header>
        {children ? <div className={cn("mun-apple-sheet-content", contentClassName)}>{children}</div> : null}
        {footer ? <footer className="mun-apple-sheet-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}

type AppleConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmRole?: "default" | "destructive";
  onConfirm: () => void;
  detent?: AppleSheetDetent;
  pending?: boolean;
};

export function AppleConfirmSheet({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmRole = "default",
  onConfirm,
  detent = "medium",
  pending = false,
}: AppleConfirmSheetProps) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  return (
    <AppleSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      detent={detent}
      grabber
      closeLabel={cancelLabel}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className="mun-apple-btn mun-apple-btn-tinted-gray w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
            className={cn(
              "mun-apple-btn w-full sm:w-auto",
              confirmRole === "destructive" ? "mun-apple-btn-filled-red" : "mun-apple-btn-filled-blue"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {message ? <p className="mun-apple-text mun-apple-text-body mun-vibrancy-secondary">{message}</p> : null}
    </AppleSheet>
  );
}
