// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

type PopoverPlacement = {
  top: number;
  left: number;
  width?: number;
  maxHeight?: number;
  arrowSide: Side;
  arrowOffset: number;
};

type ApplePopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  popoverId: string;
};

const ApplePopoverContext = createContext<ApplePopoverContextValue | null>(null);

const ARROW_SIZE = 12;
const VIEWPORT_MARGIN = 12;
const ARROW_EDGE_MARGIN = 18;

function useApplePopover() {
  const context = useContext(ApplePopoverContext);
  if (!context) throw new Error("ApplePopover components must be used within ApplePopover");
  return context;
}

function oppositeSide(side: Side): Side {
  if (side === "top") return "bottom";
  if (side === "bottom") return "top";
  if (side === "left") return "right";
  return "left";
}

function computePlacement(
  triggerRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
  preferredSide: Side,
  preferredAlign: Align,
  sideOffset: number,
  alignOffset: number,
  matchAnchorWidth: boolean
): PopoverPlacement {
  const width = matchAnchorWidth
    ? Math.min(Math.max(triggerRect.width, 220), window.innerWidth - VIEWPORT_MARGIN * 2)
    : panelWidth;

  const spaces = {
    top: triggerRect.top - VIEWPORT_MARGIN,
    bottom: window.innerHeight - triggerRect.bottom - VIEWPORT_MARGIN,
    left: triggerRect.left - VIEWPORT_MARGIN,
    right: window.innerWidth - triggerRect.right - VIEWPORT_MARGIN,
  };

  let side = preferredSide;
  const needed = side === "top" || side === "bottom" ? panelHeight + sideOffset : panelWidth + sideOffset;
  if (spaces[side] < needed && spaces[oppositeSide(side)] >= needed) {
    side = oppositeSide(side);
  }

  let top = 0;
  let left = 0;
  let maxHeight: number | undefined;

  if (side === "bottom") {
    top = triggerRect.bottom + sideOffset;
    maxHeight = Math.max(180, window.innerHeight - top - VIEWPORT_MARGIN);
    if (preferredAlign === "start") left = triggerRect.left + alignOffset;
    if (preferredAlign === "center") left = triggerRect.left + triggerRect.width / 2 - width / 2 + alignOffset;
    if (preferredAlign === "end") left = triggerRect.right - width + alignOffset;
  } else if (side === "top") {
    top = triggerRect.top - panelHeight - sideOffset;
    maxHeight = Math.max(180, triggerRect.top - sideOffset - VIEWPORT_MARGIN);
    if (preferredAlign === "start") left = triggerRect.left + alignOffset;
    if (preferredAlign === "center") left = triggerRect.left + triggerRect.width / 2 - width / 2 + alignOffset;
    if (preferredAlign === "end") left = triggerRect.right - width + alignOffset;
  } else if (side === "right") {
    left = triggerRect.right + sideOffset;
    if (preferredAlign === "start") top = triggerRect.top + alignOffset;
    if (preferredAlign === "center") top = triggerRect.top + triggerRect.height / 2 - panelHeight / 2 + alignOffset;
    if (preferredAlign === "end") top = triggerRect.bottom - panelHeight + alignOffset;
  } else {
    left = triggerRect.left - width - sideOffset;
    if (preferredAlign === "start") top = triggerRect.top + alignOffset;
    if (preferredAlign === "center") top = triggerRect.top + triggerRect.height / 2 - panelHeight / 2 + alignOffset;
    if (preferredAlign === "end") top = triggerRect.bottom - panelHeight + alignOffset;
  }

  left = Math.min(Math.max(VIEWPORT_MARGIN, left), window.innerWidth - width - VIEWPORT_MARGIN);
  top = Math.min(Math.max(VIEWPORT_MARGIN, top), window.innerHeight - Math.min(panelHeight, maxHeight ?? panelHeight) - VIEWPORT_MARGIN);

  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  let arrowSide: Side;
  let arrowOffset: number;

  if (side === "bottom") {
    arrowSide = "top";
    arrowOffset = triggerCenterX - left;
  } else if (side === "top") {
    arrowSide = "bottom";
    arrowOffset = triggerCenterX - left;
  } else if (side === "right") {
    arrowSide = "left";
    arrowOffset = triggerCenterY - top;
  } else {
    arrowSide = "right";
    arrowOffset = triggerCenterY - top;
  }

  if (arrowSide === "top" || arrowSide === "bottom") {
    arrowOffset = Math.min(Math.max(ARROW_EDGE_MARGIN, arrowOffset), width - ARROW_EDGE_MARGIN);
  } else {
    arrowOffset = Math.min(
      Math.max(ARROW_EDGE_MARGIN, arrowOffset),
      Math.min(panelHeight, maxHeight ?? panelHeight) - ARROW_EDGE_MARGIN
    );
  }

  return { top, left, width, maxHeight, arrowSide, arrowOffset };
}

type ApplePopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function ApplePopover({ open: openProp, onOpenChange, children }: ApplePopoverProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const popoverId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <ApplePopoverContext.Provider value={{ open, setOpen, triggerRef, popoverId }}>
      <div className="mun-apple-popover-root">{children}</div>
    </ApplePopoverContext.Provider>
  );
}

type ApplePopoverTriggerProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
  onClick?: () => void;
};

export function ApplePopoverTrigger({
  children,
  className,
  id,
  "aria-label": ariaLabel,
  onClick,
}: ApplePopoverTriggerProps) {
  const { open, setOpen, triggerRef, popoverId } = useApplePopover();

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      id={id}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={popoverId}
      aria-label={ariaLabel}
      onClick={() => {
        onClick?.();
        setOpen(!open);
      }}
      className={cn("mun-apple-popover-trigger", className)}
    >
      {children}
    </button>
  );
}

type ApplePopoverContentProps = {
  children: ReactNode;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  matchAnchorWidth?: boolean;
  /** Shrink tall panels (e.g. calendars) to fit the viewport instead of clipping. */
  fitViewport?: boolean;
  /** Fixed panel width when `matchAnchorWidth` is false (e.g. date pickers). */
  panelWidth?: number;
  className?: string;
  style?: CSSProperties;
  role?: string;
  "aria-label"?: string;
};

export function ApplePopoverContent({
  children,
  side = "bottom",
  align = "start",
  sideOffset = 10,
  alignOffset = 0,
  matchAnchorWidth = false,
  fitViewport = false,
  panelWidth: panelWidthProp = 280,
  className,
  style,
  role = "dialog",
  "aria-label": ariaLabel,
}: ApplePopoverContentProps) {
  const { open, setOpen, triggerRef, popoverId } = useApplePopover();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<PopoverPlacement | null>(null);
  const [fitLevel, setFitLevel] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    // No reset needed on close: the panel unmounts, and reopening recomputes
    // placement in this layout effect before paint.
    if (!open) return;

    function resolvedPanelWidth(triggerRect: DOMRect) {
      if (matchAnchorWidth) {
        return Math.min(Math.max(triggerRect.width, 220), window.innerWidth - VIEWPORT_MARGIN * 2);
      }
      return Math.min(panelWidthProp, window.innerWidth - VIEWPORT_MARGIN * 2);
    }

    function measureAndPlace() {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      panel.classList.remove("is-viewport-compact", "is-viewport-compact-tight");

      let resolvedLevel = 0;

      for (let level = 0; level <= 2; level++) {
        panel.classList.toggle("is-viewport-compact", level >= 1);
        panel.classList.toggle("is-viewport-compact-tight", level >= 2);
        void panel.offsetHeight;

        const triggerRect = trigger.getBoundingClientRect();
        const width = resolvedPanelWidth(triggerRect);
        const panelHeight = panel.offsetHeight || 300;
        const nextPlacement = computePlacement(
          triggerRect,
          width,
          panelHeight,
          side,
          align,
          sideOffset,
          alignOffset,
          matchAnchorWidth
        );
        setPlacement(nextPlacement);

        if (!fitViewport) {
          resolvedLevel = level;
          break;
        }

        const maxH = nextPlacement.maxHeight ?? window.innerHeight - VIEWPORT_MARGIN * 2;
        if (panel.scrollHeight <= maxH + 2) {
          resolvedLevel = level;
          break;
        }
        resolvedLevel = level;
      }

      setFitLevel(resolvedLevel);
    }

    measureAndPlace();
    window.addEventListener("resize", measureAndPlace);
    window.addEventListener("scroll", measureAndPlace, true);
    return () => {
      window.removeEventListener("resize", measureAndPlace);
      window.removeEventListener("scroll", measureAndPlace, true);
    };
  }, [align, alignOffset, fitViewport, matchAnchorWidth, open, panelWidthProp, side, sideOffset, triggerRef]);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const panelStyle: CSSProperties = {
    top: placement?.top,
    left: placement?.left,
    width: placement?.width,
    maxHeight: fitViewport ? undefined : placement?.maxHeight,
    visibility: placement ? undefined : "hidden",
    ...style,
  };

  return createPortal(
    <div
      ref={panelRef}
      id={popoverId}
      role={role}
      aria-label={ariaLabel}
      data-arrow-side={placement?.arrowSide ?? side}
      data-fit-level={fitViewport ? fitLevel : undefined}
      style={
        {
          ...panelStyle,
          "--popover-arrow-offset": `${placement?.arrowOffset ?? ARROW_EDGE_MARGIN}px`,
          "--popover-arrow-size": `${ARROW_SIZE}px`,
        } as CSSProperties
      }
      className={cn(
        "mun-apple-popover-panel",
        fitViewport && "mun-apple-popover-panel-fit-viewport",
        fitViewport && fitLevel > 0 && "is-viewport-compact",
        fitViewport && fitLevel > 1 && "is-viewport-compact-tight",
        className
      )}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

type AppleHelpPopoverProps = {
  label: string;
  children: ReactNode;
  side?: Side;
  align?: Align;
  className?: string;
};

export function AppleHelpPopover({ label, children, side = "bottom", align = "start", className }: AppleHelpPopoverProps) {
  return (
    <ApplePopover>
      <ApplePopoverTrigger
        aria-label={label}
        className="mun-apple-btn mun-apple-btn-tinted-gray mun-apple-btn-compact h-7 w-7 shrink-0 rounded-full p-0"
      >
        <span className="mun-apple-text mun-apple-text-footnote-emphasized leading-none">?</span>
      </ApplePopoverTrigger>
      <ApplePopoverContent side={side} align={align} className={cn("max-w-sm p-4", className)}>
        <p className="mun-apple-text mun-apple-text-subheadline mun-vibrancy-secondary">{children}</p>
      </ApplePopoverContent>
    </ApplePopover>
  );
}
