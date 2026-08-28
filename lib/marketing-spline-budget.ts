// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Cap concurrent Spline WebGL scenes so marketing pages stay stable. */
const MAX_ACTIVE_SPLINE_SCENES = 2;

let activeSplineScenes = 0;
const waitQueue: Array<() => void> = [];

export function acquireSplineSceneSlot(): Promise<void> {
  if (activeSplineScenes < MAX_ACTIVE_SPLINE_SCENES) {
    activeSplineScenes += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeSplineScenes += 1;
      resolve();
    });
  });
}

export function releaseSplineSceneSlot() {
  activeSplineScenes = Math.max(0, activeSplineScenes - 1);
  const next = waitQueue.shift();
  if (next) next();
}
