// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export function MunPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mun-shell mun-apple-material mun-apple-material-regular">
      <h2 className="mun-shell-title">{title}</h2>
      {children}
    </div>
  );
}
