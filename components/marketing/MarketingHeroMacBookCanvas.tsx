// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import { MARKETING_HERO_MACBOOK_GLTF } from "@/lib/marketing-spline-scenes";
import { cn } from "@/lib/utils";

function MacBookModel() {
  const { scene } = useGLTF(MARKETING_HERO_MACBOOK_GLTF);
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

useGLTF.preload(MARKETING_HERO_MACBOOK_GLTF);

export function MarketingHeroMacBookCanvas({ className }: { className?: string }) {
  return (
    <div className={cn("h-full w-full", className)}>
      <Canvas
        className="h-full w-full touch-none"
        camera={{ position: [0, 0.35, 2.6], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.62} />
        <directionalLight position={[5, 7, 4]} intensity={1.05} />
        <directionalLight position={[-4, 3, -2]} intensity={0.32} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.12}>
            <MacBookModel />
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.06}
              minPolarAngle={Math.PI / 5}
              maxPolarAngle={Math.PI / 1.75}
              minDistance={1.4}
              maxDistance={4.5}
            />
          </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
}
