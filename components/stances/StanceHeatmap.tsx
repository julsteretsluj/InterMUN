"use client";

export function StanceHeatmap({
  data,
}: {
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-brand-muted py-4">
        Add topics above to build your stance heatmap.
      </p>
    );
  }

  const max = 5;
  const getColor = (v: number) => {
    const ratio = v / max;
    if (ratio <= 0.2) return "bg-rose-200 dark:bg-rose-900/90";
    if (ratio <= 0.4) return "bg-logo-orange/45 dark:bg-logo-orange/35";
    if (ratio <= 0.6) return "bg-logo-yellow/50 dark:bg-logo-yellow/30";
    if (ratio <= 0.8) return "bg-logo-cyan/50 dark:bg-logo-cyan/35";
    return "bg-logo-magenta/45 dark:bg-logo-magenta/35";
  };

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "auto 1fr auto" }}>
      {entries.map(([topic, value]) => (
        <div
          key={topic}
          className="contents"
        >
          <span className="text-sm font-medium text-brand-navy">{topic}</span>
          <div className="h-8 rounded overflow-hidden bg-brand-navy/10 dark:bg-white/10">
            <div
              className={`h-full ${getColor(value)} transition-all`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums text-brand-muted">{value}/5</span>
        </div>
      ))}
    </div>
  );
}
