// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

export const WORKSPACE_ROLES = [
  "delegate",
  "chair",
  "advisor",
  "smt",
  "admin",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export function isWorkspaceRole(value: string | null | undefined): value is WorkspaceRole {
  return !!value && (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export type WorkspaceCommandGroup =
  | "session"
  | "documents"
  | "research"
  | "communications"
  | "ops"
  | "settings"
  | "crisis";

export type WorkspaceCommandItem = {
  id: string;
  href: string;
  label: string;
  group: WorkspaceCommandGroup;
  keywords?: string[];
  /** Roles that see this command. Empty/undefined = all authenticated workspace roles. */
  roles?: WorkspaceRole[];
  emoji?: string;
};
