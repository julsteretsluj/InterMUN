import { NextResponse } from "next/server";
import {
  fetchPressCorpsProfile,
  PRESS_CORPS_REVALIDATE_SECONDS,
  type PressCorpsItem,
  type PressCorpsProfile,
} from "@/lib/press-corps-instagram";

export type { PressCorpsItem };

export type PressCorpsResponse = PressCorpsProfile;

/**
 * SEAMUN Press Corps Instagram feed proxy.
 * GET /api/press-corps
 */
export async function GET() {
  const profile = await fetchPressCorpsProfile();

  return NextResponse.json(profile satisfies PressCorpsResponse, {
    status: 200,
    headers: {
      "Cache-Control": `public, s-maxage=${PRESS_CORPS_REVALIDATE_SECONDS}, stale-while-revalidate=${PRESS_CORPS_REVALIDATE_SECONDS * 2}`,
    },
  });
}
