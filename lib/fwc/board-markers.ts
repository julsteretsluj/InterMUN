// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import {
  FWC_CHARACTER_COUNTRIES,
  lookupFwcCharacter,
  type FwcCharacterCountry,
} from "@/lib/fwc/characters";

/** Stable marker chrome per seated FWC character (seamun-friendly, high contrast on map). */
export const FWC_MARKER_COLORS: Record<FwcCharacterCountry, string> = {
  "Agent Connie Frazier": "#007AFF",
  "Colonel KGB": "#AF52DE",
  "Dr. Martin Brenner": "#8E8E93",
  "Dr. Sam Owens": "#34C759",
  "Eleven (011/Jane Ives)": "#FF2D55",
  "Henry Creel (001/Vecna)": "#FF3B30",
  "Jim Hopper": "#5856D6",
  "Joyce Byers": "#FF9500",
  "Kali Prasad (008)": "#5AC8FA",
  "Lt. Colonel Jack Sullivan": "#1D1D1F",
};

/** Short board labels (initials / callsigns) so markers stay readable in one cell. */
export const FWC_MARKER_SHORT_LABELS: Record<FwcCharacterCountry, string> = {
  "Agent Connie Frazier": "CF",
  "Colonel KGB": "KG",
  "Dr. Martin Brenner": "MB",
  "Dr. Sam Owens": "SO",
  "Eleven (011/Jane Ives)": "11",
  "Henry Creel (001/Vecna)": "HC",
  "Jim Hopper": "JH",
  "Joyce Byers": "JB",
  "Kali Prasad (008)": "KP",
  "Lt. Colonel Jack Sullivan": "JS",
};

/** Optional circular badge art for characters that have a custom map marker. */
export const FWC_MARKER_ICONS: Partial<Record<FwcCharacterCountry, string>> = {
  "Agent Connie Frazier": "/fwc/markers/connie-frazier.jpg",
  "Colonel KGB": "/fwc/markers/grigori.jpg",
  "Dr. Martin Brenner": "/fwc/markers/brenner.jpg",
  "Dr. Sam Owens": "/fwc/markers/owens.jpg",
  "Eleven (011/Jane Ives)": "/fwc/markers/eleven.jpg",
  "Henry Creel (001/Vecna)": "/fwc/markers/henry-creel.jpg",
  "Jim Hopper": "/fwc/markers/hopper.jpg",
  "Joyce Byers": "/fwc/markers/joyce.jpg",
  "Kali Prasad (008)": "/fwc/markers/kali.jpg",
  "Lt. Colonel Jack Sullivan": "/fwc/markers/sullivan.jpg",
};

const FALLBACK_PALETTE = [
  "#007AFF",
  "#FF9500",
  "#34C759",
  "#AF52DE",
  "#FF2D55",
  "#5856D6",
  "#5AC8FA",
  "#1D1D1F",
] as const;

export function fwcMarkerColorForCountry(country: string): string {
  if (country in FWC_MARKER_COLORS) {
    return FWC_MARKER_COLORS[country as FwcCharacterCountry];
  }
  let hash = 0;
  for (let i = 0; i < country.length; i++) hash = (hash * 31 + country.charCodeAt(i)) | 0;
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length]!;
}

export function fwcMarkerShortLabel(country: string, displayName: string): string {
  const catalog = lookupFwcCharacter(country);
  const key = (catalog?.country ?? country) as FwcCharacterCountry;
  if (key in FWC_MARKER_SHORT_LABELS) {
    return FWC_MARKER_SHORT_LABELS[key];
  }
  const parts = displayName
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !/^\d+$/.test(p) && p.toLowerCase() !== "dr." && p.toLowerCase() !== "lt.");
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (displayName.slice(0, 2) || "?").toUpperCase();
}

/** Resolve a custom badge icon via catalog lookup (aliases like “Colonel Grigori” → Colonel KGB). */
export function fwcMarkerIconSrc(country: string): string | null {
  const catalog = lookupFwcCharacter(country);
  if (!catalog) return null;
  return FWC_MARKER_ICONS[catalog.country as FwcCharacterCountry] ?? null;
}

export const FWC_MARKER_LEGEND = FWC_CHARACTER_COUNTRIES.map((country) => ({
  country,
  shortLabel: FWC_MARKER_SHORT_LABELS[country],
  color: FWC_MARKER_COLORS[country],
  iconSrc: FWC_MARKER_ICONS[country] ?? null,
}));
