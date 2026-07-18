// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import { GlassPanel } from "@/components/ui/GlassPanel";

export function MunPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel className="space-y-4" material="regular" interactive={false}>
      <h2 className="mun-apple-text mun-apple-text-title-2-emphasized !mb-0">{title}</h2>
      {children}
    </GlassPanel>
  );
}
