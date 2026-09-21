export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[var(--content-max-width,82.5rem)] space-y-4 px-4 py-8 sm:px-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)]" />
      <div className="h-40 animate-pulse rounded-2xl bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]" />
      <div className="h-56 animate-pulse rounded-2xl bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]" />
    </div>
  );
}
