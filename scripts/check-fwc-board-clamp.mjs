// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/**
 * Simulates many board sizes / marker placements and asserts every Hawkins
 * board marker box stays inside the board.
 *
 *   node --experimental-strip-types scripts/check-fwc-board-clamp.mjs
 */

import {
  FWC_DEFAULT_MARKER_EXTENT,
  fwcMarkerExtentFromSize,
  fwcResolveMarkerCenterPx,
} from "../lib/fwc/board-clamp.ts";

let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const extents = [
  FWC_DEFAULT_MARKER_EXTENT,
  fwcMarkerExtentFromSize(32, 32),
  fwcMarkerExtentFromSize(32, 48),
  fwcMarkerExtentFromSize(40, 46),
  fwcMarkerExtentFromSize(28, 44),
];

let checks = 0;
let failures = 0;
for (let frame = 0; frame < 20000; frame++) {
  // Board is square; ~300px on a 375 phone up to 2.5× zoom of the 56rem cap.
  const size = 300 + rand() * 1950;
  const stackTotal = 1 + Math.floor(rand() * 12);
  const step = rand() < 0.5 ? 10 : 9;
  const mid = (stackTotal - 1) / 2;
  // Include out-of-range points to prove clamping, not just good data.
  const leftPct = -10 + rand() * 120;
  const topPct = -10 + rand() * 120;
  for (let i = 0; i < stackTotal; i++) {
    const extent = extents[Math.floor(rand() * extents.length)];
    const { x, y } = fwcResolveMarkerCenterPx(
      { leftPct, topPct, offsetPx: (i - mid) * step, spreadPx: mid * step, extent },
      size,
      size
    );
    checks++;
    if (
      x - extent.halfWidth < 0 ||
      x + extent.halfWidth > size ||
      y - extent.halfHeight < 0 ||
      y + extent.halfHeight > size
    ) {
      failures++;
      if (failures <= 5) console.error("escaped", { size, leftPct, topPct, i, stackTotal, x, y });
    }
  }
}

if (failures > 0) {
  console.error(`${failures}/${checks} marker placements escaped the board`);
  process.exit(1);
}
console.log(`ok: ${checks} marker placements stayed inside the board`);
