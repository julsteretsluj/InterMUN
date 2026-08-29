// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { Application } from "@splinetool/runtime";

type OrbitControls = {
  enabled?: boolean;
  enableRotate?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
};

type PublishSettings = {
  orbitControls?: OrbitControls;
  preventScroll?: boolean;
  preventTouchScroll?: boolean;
};

type SplineRendererPipeline = {
  setWatermark?: (texture: unknown) => void;
  logoOverlayPass?: { enabled: boolean };
};

type SplineAppWithRenderer = Application & {
  _renderer?: {
    pipeline?: SplineRendererPipeline;
  };
};

/** Hide the Spline "Built with Spline" watermark overlay on marketing scenes. */
export function hideMarketingSplineWatermark(app: Application) {
  const disable = () => {
    const pipeline = (app as SplineAppWithRenderer)._renderer?.pipeline;
    pipeline?.setWatermark?.(null);
    if (pipeline?.logoOverlayPass) pipeline.logoOverlayPass.enabled = false;
  };

  disable();
  requestAnimationFrame(disable);
}

/** Enable drag, zoom, and pan on exported Spline marketing scenes. */
export function enableMarketingSplineControls(app: Application) {
  const orbit = app.controls?.orbitControls as OrbitControls | undefined;
  if (orbit) {
    orbit.enabled = true;
    orbit.enableRotate = true;
    orbit.enableZoom = true;
    orbit.enablePan = true;
  }

  const publish = app.eventManager?.publish as PublishSettings | undefined;
  if (publish?.orbitControls) {
    publish.orbitControls.enableRotate = true;
    publish.orbitControls.enableZoom = true;
    publish.orbitControls.enablePan = true;
  }

  if (publish) {
    publish.preventScroll = true;
    publish.preventTouchScroll = true;
  }
}
