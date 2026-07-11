// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pipette, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  APPLE_COLOR_GRID,
  clamp,
  hexToHsb,
  hsbToHex,
  parseHexColor,
  withAlpha,
} from "@/lib/apple-color-picker";
import { cn } from "@/lib/utils";
import { AppleSegmentedControl } from "@/components/ui/AppleSegmentedControl";
import { AppleSlider } from "@/components/ui/AppleSlider";

type ColorPickerTab = "grid" | "spectrum" | "sliders";

type AppleColorPickerProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  color: string;
  opacity?: number;
  onColorChange: (color: string, opacity: number) => void;
  presets?: string[];
  title?: string;
  embedded?: boolean;
  className?: string;
};

function normalizeColor(color: string) {
  return parseHexColor(color) ?? "#007aff";
}

export function AppleColorPicker({
  open = true,
  onOpenChange,
  color,
  opacity = 100,
  onColorChange,
  presets = [],
  title,
  embedded = false,
  className,
}: AppleColorPickerProps) {
  const t = useTranslations("appleColorPicker");
  const titleText = title ?? t("title");
  const [tab, setTab] = useState<ColorPickerTab>("grid");
  const [localColor, setLocalColor] = useState(() => normalizeColor(color));
  const [localOpacity, setLocalOpacity] = useState(opacity);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hsb = useMemo(() => hexToHsb(localColor), [localColor]);

  useEffect(() => {
    setLocalColor(normalizeColor(color));
  }, [color]);

  useEffect(() => {
    setLocalOpacity(opacity);
  }, [opacity]);

  useEffect(() => {
    if (embedded || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [embedded, open]);

  useLayoutEffect(() => {
    if (embedded || !open) return;
    panelRef.current?.focus();
  }, [embedded, open]);

  function commit(nextColor: string, nextOpacity = localOpacity) {
    const parsed = normalizeColor(nextColor);
    setLocalColor(parsed);
    onColorChange(parsed, nextOpacity);
  }

  function commitOpacity(nextOpacity: number) {
    const clamped = clamp(nextOpacity, 0, 100);
    setLocalOpacity(clamped);
    onColorChange(localColor, clamped);
  }

  function updateHsb(next: Partial<{ h: number; s: number; b: number }>) {
    const merged = {
      h: next.h ?? hsb.h,
      s: next.s ?? hsb.s,
      b: next.b ?? hsb.b,
    };
    commit(hsbToHex(merged.h, merged.s, merged.b));
  }

  function pickFromSpectrum(clientX: number, clientY: number) {
    const node = spectrumRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    updateHsb({ s: x * 100, b: (1 - y) * 100 });
  }

  async function pickWithEyeDropper() {
    if (typeof window === "undefined" || !("EyeDropper" in window)) return;
    try {
      type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
      const Dropper = (window as Window & { EyeDropper: EyeDropperCtor }).EyeDropper;
      const dropper = new Dropper();
      const result = await dropper.open();
      commit(result.sRGBHex);
    } catch {
      /* user cancelled */
    }
  }

  const opacityTrackId = useId();
  const content = (
    <div
      ref={panelRef}
      role={embedded ? "group" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label={titleText}
      tabIndex={embedded ? undefined : -1}
      className={cn("mun-apple-color-picker", embedded && "mun-apple-color-picker-embedded", className)}
    >
      {!embedded ? (
        <header className="mun-apple-color-picker-toolbar">
          <button
            type="button"
            className="mun-apple-btn mun-apple-btn-icon mun-apple-btn-tinted-gray mun-apple-btn-compact"
            aria-label={t("eyedropper")}
            onClick={() => void pickWithEyeDropper()}
          >
            <Pipette className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <h2 className="mun-apple-color-picker-toolbar-title">{titleText}</h2>
          <button
            type="button"
            className="mun-apple-btn mun-apple-btn-icon mun-apple-btn-tinted-gray mun-apple-btn-compact"
            aria-label={t("close")}
            onClick={() => onOpenChange?.(false)}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </header>
      ) : null}

      <AppleSegmentedControl
        className="mx-3 mb-3"
        size="compact"
        aria-label={titleText}
        items={(["grid", "spectrum", "sliders"] as const).map((value) => ({
          id: value,
          label: t(value),
        }))}
        value={tab}
        onValueChange={(value) => setTab(value as ColorPickerTab)}
      />

      <div className="mun-apple-color-picker-body">
        {tab === "grid" ? (
          <div className="mun-apple-color-picker-grid" role="listbox" aria-label={t("grid")}>
            {APPLE_COLOR_GRID.map((swatch) => {
              const selected = swatch.toLowerCase() === localColor.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn("mun-apple-color-picker-grid-swatch", selected && "is-selected")}
                  style={{ backgroundColor: swatch }}
                  onClick={() => commit(swatch)}
                >
                  <span className="sr-only">{swatch}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {tab === "spectrum" ? (
          <div className="mun-apple-color-picker-spectrum-wrap">
            <div
              ref={spectrumRef}
              className="mun-apple-color-picker-spectrum"
              style={{
                backgroundColor: hsbToHex(hsb.h, 100, 100),
                backgroundImage:
                  "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                pickFromSpectrum(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                pickFromSpectrum(event.clientX, event.clientY);
              }}
            >
              <span
                className="mun-apple-color-picker-spectrum-thumb"
                style={{
                  left: `${hsb.s}%`,
                  top: `${100 - hsb.b}%`,
                  backgroundColor: localColor,
                }}
                aria-hidden
              />
            </div>
            <AppleSlider
              variant="glass"
              min={0}
              max={360}
              step={1}
              value={Math.round(hsb.h)}
              aria-label={t("hue")}
              hideFill
              trackStyle={{
                background:
                  "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
              onChange={(hue) => updateHsb({ h: hue })}
            />
          </div>
        ) : null}

        {tab === "sliders" ? (
          <div className="mun-apple-color-picker-sliders space-y-3">
            {[
              { key: "h", label: t("hue"), min: 0, max: 360, value: hsb.h },
              { key: "s", label: t("saturation"), min: 0, max: 100, value: hsb.s },
              { key: "b", label: t("brightness"), min: 0, max: 100, value: hsb.b },
            ].map((slider) => (
              <AppleSlider
                key={slider.key}
                variant="standard"
                label={slider.label}
                valueLabel={Math.round(slider.value)}
                min={slider.min}
                max={slider.max}
                step={1}
                showTicks
                tickCount={5}
                value={Math.round(slider.value)}
                onChange={(next) =>
                  updateHsb({
                    h: slider.key === "h" ? next : undefined,
                    s: slider.key === "s" ? next : undefined,
                    b: slider.key === "b" ? next : undefined,
                  })
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mun-apple-color-picker-opacity">
        <AppleSlider
          id={opacityTrackId}
          variant="compact"
          label={t("opacity")}
          valueLabel={`${localOpacity}%`}
          min={0}
          max={100}
          step={1}
          value={localOpacity}
          aria-label={t("opacity")}
          hideFill
          trackClassName="mun-apple-color-picker-opacity-track-inner"
          trackStyle={{
            backgroundImage: `linear-gradient(to right, transparent, ${localColor}), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)`,
            backgroundSize: "auto, 8px 8px, 8px 8px",
            backgroundPosition: "0 0, 0 0, 4px 4px",
          }}
          onChange={(next) => commitOpacity(next)}
        />
      </div>

      <footer className="mun-apple-color-picker-footer">
        <div
          className="mun-apple-color-picker-preview"
          style={{ backgroundColor: withAlpha(localColor, localOpacity) }}
          aria-hidden
        />
        <div className="mun-apple-color-picker-presets" role="list" aria-label={t("presets")}>
          {presets.map((preset) => {
            const selected = preset.toLowerCase() === localColor.toLowerCase();
            return (
              <button
                key={preset}
                type="button"
                role="listitem"
                aria-label={preset}
                className={cn("mun-apple-color-picker-preset", selected && "is-selected")}
                style={{ backgroundColor: preset }}
                onClick={() => commit(preset)}
              />
            );
          })}
          <button type="button" className="mun-apple-color-picker-add" aria-label={t("addPreset")} disabled>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );

  if (embedded) return content;
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="mun-apple-color-picker-root">
      <button
        type="button"
        className="mun-apple-color-picker-scrim"
        aria-label={t("close")}
        onClick={() => onOpenChange?.(false)}
      />
      {content}
    </div>,
    document.body
  );
}
