// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { ThemeHue } from "@/lib/theme-storage";

export const THEME_HUE_HEX: Record<ThemeHue, string> = {
  blue: "#0071e3",
  green: "#059669",
  red: "#dc2626",
  orange: "#f97316",
  yellow: "#eab308",
  purple: "#7c3aed",
  pink: "#db2777",
  neutral: "#71717a",
};

export function themeHueToHex(hue: ThemeHue): string {
  return THEME_HUE_HEX[hue];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parseHexColor(input: string): string | null {
  const normalized = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(normalized)) return `#${normalized.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toLowerCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const parsed = parseHexColor(hex) ?? "#007aff";
  const value = parsed.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsb(hex: string): { h: number; s: number; b: number } {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const brightness = max * 100;
  return { h, s, b: brightness };
}

export function hsbToHex(h: number, s: number, b: number): string {
  const saturation = clamp(s, 0, 100) / 100;
  const brightness = clamp(b, 0, 100) / 100;
  const chroma = brightness * saturation;
  const huePrime = (clamp(h, 0, 360) / 60) % 6;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const m = brightness - chroma;

  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (huePrime >= 0 && huePrime < 1) [rn, gn, bn] = [chroma, x, 0];
  else if (huePrime < 2) [rn, gn, bn] = [x, chroma, 0];
  else if (huePrime < 3) [rn, gn, bn] = [0, chroma, x];
  else if (huePrime < 4) [rn, gn, bn] = [0, x, chroma];
  else if (huePrime < 5) [rn, gn, bn] = [x, 0, chroma];
  else [rn, gn, bn] = [chroma, 0, x];

  return rgbToHex((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}

export function buildAppleColorGrid(): string[] {
  const colors: string[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const hue = (col / 10) * 360;
      const saturation = clamp(88 - row * 6, 28, 92);
      const brightness = clamp(94 - row * 7, 24, 96);
      colors.push(hsbToHex(hue, saturation, brightness));
    }
  }
  return colors;
}

export function nearestThemeHue(hex: string, hues: readonly ThemeHue[] = Object.keys(THEME_HUE_HEX) as ThemeHue[]): ThemeHue {
  const { r, g, b } = hexToRgb(hex);
  let best: ThemeHue = hues[0] ?? "blue";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const hue of hues) {
    const candidate = hexToRgb(THEME_HUE_HEX[hue]);
    const distance = (r - candidate.r) ** 2 + (g - candidate.g) ** 2 + (b - candidate.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = hue;
    }
  }

  return best;
}

export function withAlpha(hex: string, opacityPct: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacityPct, 0, 100) / 100})`;
}

export const APPLE_COLOR_GRID = buildAppleColorGrid();
