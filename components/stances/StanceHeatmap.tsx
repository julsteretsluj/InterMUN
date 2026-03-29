"use client";

export function StanceHeatmap({
  data,
}: {
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-brand-muted/70 py-4">
        Add topics above to build your stance heatmap.
      </p>
    );
  }

  const max = 5;
  const getColor = (v: number) => {
    const ratio = v / max;
    if (ratio <= 0.2) return "bg-red-200 dark:bg-red-900";
    if (ratio <= 0.4) return "bg-orange-200 dark:bg-orange-900";
    if (ratio <= 0.6) return "bg-yellow-200 dark:bg-yellow-900";
    if (ratio <= 0.8) return "bg-lime-200 dark:bg-lime-900";
    return "bg-green-200 dark:bg-green-900";
  };

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "auto 1fr auto" }}>
      {entries.map(([topic, value]) => (
        <div
          key={topic}
          className="contents"
        >
          <span className="text-sm font-medium">{topic}</span>
          <div className="h-8 rounded overflow-hidden bg-black/25 bg-black/35">
            <div
              className={`h-full ${getColor(value)} transition-all`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="text-sm text-brand-muted/70">{value}/5</span>
        </div>
      ))}
    </div>
  );
}
