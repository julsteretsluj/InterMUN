import { NextResponse } from "next/server";
import { loadMilestonesForViewer } from "@/lib/milestones-data";
import {
  totalEarnedCheckpoints,
  type MilestoneMetricId,
  type MilestoneProgress,
} from "@/lib/committee-milestones";

export type MilestonesSummary = {
  earned: number;
  total: number;
  highlights: {
    metricId: MilestoneMetricId;
    icon: string;
    count: number;
    highestAchieved: number | null;
    maxed: boolean;
  }[];
};

function toHighlights(list: MilestoneProgress[]): MilestonesSummary["highlights"] {
  return list.slice(0, 4).map((p) => ({
    metricId: p.metricId,
    icon: p.icon,
    count: p.count,
    highestAchieved: p.highestAchieved,
    maxed: p.nextThreshold == null,
  }));
}

/** Compact milestone headline for dashboard cards (GET /api/milestones/summary). */
export async function GET() {
  try {
    const data = await loadMilestonesForViewer();

    // Prefer a real committee chamber for the dashboard card; fall back to council.
    const primaryGroup =
      data.committees.find((c) => c.kind !== "council" && c.committee.length > 0) ??
      data.committees.find((c) => c.committee.length > 0) ??
      data.committees[0];
    const primary = data.self?.milestones ?? primaryGroup?.committee ?? [];
    if (primary.length > 0) {
      const { earned, total } = totalEarnedCheckpoints(primary);
      return NextResponse.json({
        earned,
        total,
        highlights: toHighlights(primary),
      } satisfies MilestonesSummary);
    }

    // Advisor: aggregate across their assigned delegates' milestones.
    const delegates = data.committees.flatMap((c) => c.delegates);
    if (delegates.length > 0) {
      let earned = 0;
      let total = 0;
      const counts = new Map<MilestoneMetricId, { icon: string; count: number }>();
      for (const d of delegates) {
        const totals = totalEarnedCheckpoints(d.milestones);
        earned += totals.earned;
        total += totals.total;
        for (const m of d.milestones) {
          const e = counts.get(m.metricId) ?? { icon: m.icon, count: 0 };
          e.count += m.count;
          counts.set(m.metricId, e);
        }
      }
      const highlights = [...counts.entries()].slice(0, 4).map(([metricId, v]) => ({
        metricId,
        icon: v.icon,
        count: v.count,
        highestAchieved: null,
        maxed: false,
      }));
      return NextResponse.json({ earned, total, highlights } satisfies MilestonesSummary);
    }

    return NextResponse.json({ earned: 0, total: 0, highlights: [] } satisfies MilestonesSummary);
  } catch {
    return NextResponse.json({ earned: 0, total: 0, highlights: [] } satisfies MilestonesSummary);
  }
}
