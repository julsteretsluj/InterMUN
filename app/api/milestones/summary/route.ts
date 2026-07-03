import { NextResponse } from "next/server";
import { loadMilestonesForViewer } from "@/lib/milestones-data";
import { totalEarnedCheckpoints, type MilestoneMetricId } from "@/lib/committee-milestones";

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

/** Compact milestone headline for dashboard cards (GET /api/milestones/summary). */
export async function GET() {
  try {
    const data = await loadMilestonesForViewer();
    const primary = data.self?.milestones ?? data.committees[0]?.committee ?? [];
    const { earned, total } = totalEarnedCheckpoints(primary);
    return NextResponse.json({
      earned,
      total,
      highlights: primary.slice(0, 4).map((p) => ({
        metricId: p.metricId,
        icon: p.icon,
        count: p.count,
        highestAchieved: p.highestAchieved,
        maxed: p.nextThreshold == null,
      })),
    } satisfies MilestonesSummary);
  } catch {
    return NextResponse.json({ earned: 0, total: 0, highlights: [] } satisfies MilestonesSummary);
  }
}
