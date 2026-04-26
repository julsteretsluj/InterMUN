"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function awardsToList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ProfilePreviewAvatar({ imageUrl, initials }: { imageUrl: string; initials: string }) {
  const [imgBroken, setImgBroken] = useState(false);
  const showImg = imageUrl.trim().length > 0 && !imgBroken;
  return (
    <div className="relative mx-auto mb-4 aspect-square w-28 shrink-0 overflow-hidden rounded-full border border-brand-line/60 bg-brand-navy-soft sm:mx-0">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-brand-accent/15 font-display text-2xl font-semibold text-brand-navy">
          {initials}
        </div>
      )}
    </div>
  );
}

export function ProfileLivePreview({
  imageUrl,
  name,
  username,
  pronouns,
  school,
  grade,
  allocation,
  conferencesAttended,
  awardsRaw,
  canViewPrivate,
  className,
}: {
  imageUrl: string;
  name: string;
  username: string;
  pronouns: string;
  school: string;
  grade: string;
  allocation: string;
  conferencesAttended: number | undefined;
  awardsRaw: string;
  canViewPrivate: boolean;
  className?: string;
}) {
  const initials = useMemo(() => initialsFromName(name), [name]);
  const gradeLabel = grade.trim() ? `Grade ${grade.trim()}` : null;
  const usernameLine = username.trim().toLowerCase();
  const awardItems = useMemo(() => awardsToList(awardsRaw), [awardsRaw]);

  return (
    <aside
      className={cn(
        "rounded-2xl border border-[var(--hairline)] bg-[var(--material-thick)] p-5 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150 lg:sticky lg:top-24",
        className
      )}
      aria-label="Profile preview"
    >
      <p className="mun-label mb-4">Preview</p>

      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <ProfilePreviewAvatar key={imageUrl} imageUrl={imageUrl} initials={initials} />

        <h2 className="font-display text-xl font-semibold tracking-tight text-brand-navy dark:text-zinc-100">
          {name.trim() || "Your name"}
        </h2>

        {usernameLine ? (
          <p className="mt-1 font-mono text-sm text-brand-muted">@{usernameLine}</p>
        ) : (
          <p className="mt-1 text-sm text-brand-muted">Username not set</p>
        )}

        <dl className="mun-group-list mt-5 w-full text-sm">
          {pronouns.trim() ? (
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                Pronouns
              </dt>
              <dd className="mt-0.5 text-brand-navy dark:text-zinc-200">{pronouns.trim()}</dd>
            </div>
          ) : null}

          {school.trim() ? (
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                School
              </dt>
              <dd className="mt-0.5 text-brand-navy dark:text-zinc-200">{school.trim()}</dd>
            </div>
          ) : null}

          {gradeLabel ? (
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                Grade
              </dt>
              <dd className="mt-0.5 text-brand-navy dark:text-zinc-200">{gradeLabel}</dd>
            </div>
          ) : null}

          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
              Allocation
            </dt>
            <dd className="mt-0.5 font-medium text-brand-navy dark:text-zinc-100">
              {allocation.trim() || "—"}
            </dd>
          </div>

          {canViewPrivate ? (
            <>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Conferences attended
                </dt>
                <dd className="mt-0.5 tabular-nums text-brand-navy dark:text-zinc-200">
                  {conferencesAttended ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-muted">
                  Awards
                </dt>
                <dd className="mt-0.5 text-brand-navy dark:text-zinc-200">
                  {awardItems.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {awardItems.map((a, i) => (
                        <li key={`${i}-${a}`} className="rounded-md bg-brand-navy-soft px-2 py-1 text-left text-xs dark:bg-white/5">
                          {a}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-brand-muted">—</span>
                  )}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>
    </aside>
  );
}
