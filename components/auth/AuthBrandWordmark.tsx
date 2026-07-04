"use client";

import { BrandWordmark } from "@/components/BrandWordmark";
import { OrbPlayTrigger } from "@/components/marketing/OrbPlayTrigger";

export function AuthBrandWordmark({
  className,
  size,
}: {
  className?: string;
  size?: "default" | "hero";
}) {
  return (
    <OrbPlayTrigger className="mx-auto block w-full text-center">
      <BrandWordmark className={className} size={size} />
    </OrbPlayTrigger>
  );
}
