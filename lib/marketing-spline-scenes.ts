// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

/** Marketing hero — glass device scene. */
export const MARKETING_HERO_SPLINE_SCENE =
  "https://prod.spline.design/NhFmyOJD6c4fCNht/scene.splinecode";

/**
 * Origin globe — export from Spline and paste the public scene URL here.
 * Leave empty to fall back to the static globe image until the scene is ready.
 */
export const MARKETING_ORIGIN_GLOBE_SPLINE_SCENE =
  process.env.NEXT_PUBLIC_MARKETING_ORIGIN_GLOBE_SPLINE_SCENE ?? "";

/**
 * Glass orb accent — frosted circle scene for ambient marketing decoration.
 * Set `NEXT_PUBLIC_MARKETING_GLASS_ORB_SPLINE_SCENE` when the Spline export is ready.
 */
export const MARKETING_GLASS_ORB_SPLINE_SCENE =
  process.env.NEXT_PUBLIC_MARKETING_GLASS_ORB_SPLINE_SCENE ?? "";

/** Floating marketing clock — shown on every marketing page. */
export const MARKETING_CLOCK_SPLINE_SCENE =
  "https://prod.spline.design/j4sVMI8xFPsxYls3/scene.splinecode";
