// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useRef, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type AppleAlertButton = {
  id: string;
  label: string;
  role?: "default" | "destructive" | "cancel";
  onSelect: () => void;
};

export type AppleAlertField = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
};

type AppleAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  fields?: AppleAlertField[];
  buttons: AppleAlertButton[];
  className?: string;
};

function sortAlertButtons(buttons: AppleAlertButton[]) {
  const cancel = buttons.filter((button) => button.role === "cancel");
  const primary = buttons.filter((button) => button.role !== "cancel");
  return [...primary, ...cancel];
}

function useHorizontalAlertLayout(buttons: AppleAlertButton[]) {
  if (buttons.length !== 2) return false;
  const roles = new Set(buttons.map((button) => button.role ?? "default"));
  return roles.has("cancel") && roles.has("default") && !roles.has("destructive");
}

export function AppleAlert({
  open,
  onOpenChange,
  title,
  message,
  fields = [],
  buttons,
  className,
}: AppleAlertProps) {
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const orderedButtons = sortAlertButtons(buttons);
  const horizontal = useHorizontalAlertLayout(orderedButtons);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const cancel = buttons.find((button) => button.role === "cancel");
        if (cancel) cancel.onSelect();
        else onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, buttons, onOpenChange]);

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

  function handleButton(button: AppleAlertButton) {
    button.onSelect();
    close();
  }

  const displayButtons = horizontal ? [...orderedButtons].reverse() : orderedButtons;

  return createPortal(
    <div className={cn("mun-apple-alert-root", className)}>
      <button
        type="button"
        className="mun-apple-alert-scrim"
        aria-label="Dismiss"
        onClick={() => {
          const cancel = buttons.find((button) => button.role === "cancel");
          if (cancel) handleButton(cancel);
          else close();
        }}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
        className="mun-apple-alert-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mun-apple-alert-content">
          <h2 id={titleId} className="mun-apple-alert-title">
            {title}
          </h2>
          {message ? (
            <p id={messageId} className="mun-apple-alert-message">
              {message}
            </p>
          ) : null}
          {fields.length > 0 ? (
            <div className="mun-apple-alert-fields">
              {fields.map((field, index) => (
                <label key={field.id} className="mun-apple-alert-field">
                  <span className="sr-only">{field.label}</span>
                  <input
                    id={field.id}
                    type={field.type ?? "text"}
                    inputMode={field.inputMode}
                    value={field.value}
                    placeholder={field.placeholder ?? field.label}
                    aria-label={field.label}
                    onChange={(event) => field.onChange(event.target.value)}
                    className="mun-apple-alert-field-input"
                  />
                  {index < fields.length - 1 ? <span className="mun-apple-alert-field-divider" aria-hidden /> : null}
                </label>
              ))}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "mun-apple-alert-buttons",
            horizontal ? "mun-apple-alert-buttons-horizontal" : "mun-apple-alert-buttons-vertical"
          )}
          role="group"
          aria-label={title}
        >
          {displayButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => handleButton(button)}
              className={cn(
                "mun-apple-btn mun-apple-alert-button",
                button.role === "default" && "mun-apple-btn-filled-blue mun-apple-alert-button-default",
                button.role === "destructive" && "mun-apple-btn-tinted-red mun-apple-alert-button-destructive",
                button.role === "cancel" && "mun-apple-btn-tinted-gray mun-apple-alert-button-cancel",
                button.role !== "default" &&
                  button.role !== "destructive" &&
                  button.role !== "cancel" &&
                  "mun-apple-btn-tinted-gray"
              )}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
