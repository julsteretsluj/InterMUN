import type { SupabaseClient } from "@supabase/supabase-js";
import { sortRowsByAllocationCountry } from "@/lib/allocation-display-order";
import type { DaisSeat, DelegatePlacard } from "@/components/committee-room/VirtualCommitteeRoom";

type ProfileEmbed = {
  name: string | null;
  pronouns: string | null;
  school: string | null;
};

function embedProfile(p: ProfileEmbed | ProfileEmbed[] | null): ProfileEmbed | null {
  if (p == null) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

export type StaffAllocationRow = {
  id: string;
  country: string | null;
  user_id: string | null;
  display_name_override: string | null;
  display_pronouns_override: string | null;
  display_school_override: string | null;
};

export type CommitteeRoomPayload = {
  conference: { id: string; name: string; committee: string | null } | null;
  placards: DelegatePlacard[];
  dais: DaisSeat[];
  staffAllocations: StaffAllocationRow[];
  delegates: { id: string; name: string | null }[];
};

function daisFromChairNamesField(raw: string | null | undefined): DaisSeat[] | null {
  const parts =
    raw
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (parts.length === 0) return null;
  return [
    { title: "Chair", name: parts[0] ?? null, showGavel: true, profileId: null },
    { title: "Vice-Chair", name: parts[1] ?? null, showGavel: true, profileId: null },
    { title: "Rapporteur", name: parts[2] ?? null, showGavel: true, profileId: null },
  ];
}

function daisFromChairAllocations(
  allocationRows: {
    country: string | null;
    user_id: string | null;
    display_name_override: string | null;
    profiles: ProfileEmbed | ProfileEmbed[] | null;
  }[]
): DaisSeat[] | null {
  function nameFromRow(
    row:
      | {
          country: string | null;
          user_id: string | null;
          display_name_override: string | null;
          profiles: ProfileEmbed | ProfileEmbed[] | null;
        }
      | undefined
  ) {
    if (!row || !row.user_id) return null;
    const p = embedProfile(row.profiles);
    const override = String(row.display_name_override ?? "").trim();
    return override || p?.name?.trim() || null;
  }
  const byLabel = new Map(
    allocationRows.map((r) => [String(r.country ?? "").trim().toLowerCase(), r] as const)
  );
  const head = byLabel.get("head chair");
  const co = byLabel.get("co-chair") ?? byLabel.get("co chair");
  if (!head && !co) return null;

  const headProfile = embedProfile(head?.profiles ?? null);
  const coProfile = embedProfile(co?.profiles ?? null);

  return [
    {
      title: "Head Chair",
      name: nameFromRow(head),
      showGavel: true,
      profileId: head?.user_id ?? null,
    },
    {
      title: "Co-chair",
      name: nameFromRow(co),
      showGavel: true,
      profileId: co?.user_id ?? null,
    },
    {
      title: "Rapporteur",
      name: null,
      showGavel: true,
      profileId: null,
    },
  ];
}

function placardsFromAllocationRows(
  allocationRows: {
    id: string;
    country: string | null;
    user_id: string | null;
    display_name_override: string | null;
    display_pronouns_override: string | null;
    display_school_override: string | null;
    profiles: ProfileEmbed | ProfileEmbed[] | null;
  }[]
): DelegatePlacard[] {
  return allocationRows.map((row) => {
    const p = embedProfile(row.profiles);
    const vacant = !row.user_id;
    const nameOverride = String(row.display_name_override ?? "").trim();
    const pronounsOverride = String(row.display_pronouns_override ?? "").trim();
    const schoolOverride = String(row.display_school_override ?? "").trim();
    return {
      allocationId: row.id,
      country: String(row.country ?? "").trim() || "—",
      name: vacant ? null : nameOverride ? nameOverride : p?.name?.trim() || null,
      school: vacant ? null : schoolOverride ? schoolOverride : p?.school?.trim() || null,
      pronouns: vacant ? null : pronounsOverride ? pronounsOverride : p?.pronouns?.trim() || null,
      vacant,
    };
  });
}

/**
 * Loads placards, dais, and staff controls data for the virtual committee room (delegate or SMT view).
 */
export async function loadCommitteeRoomPayload(
  supabase: SupabaseClient,
  conferenceId: string,
  options: {
    includeDelegatesForStaff: boolean;
    /** Prefer dais names from Conference & committees “Chair names” when set. */
    chairNamesHint?: string | null;
  }
): Promise<CommitteeRoomPayload> {
  const { data: conference } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .eq("id", conferenceId)
    .maybeSingle();

  const { data: allocationRows } = await supabase
    .from("allocations")
    .select(
      "id, country, user_id, display_name_override, display_pronouns_override, display_school_override, profiles(name, pronouns, school)"
    )
    .eq("conference_id", conferenceId)
    .order("country");

  const rows = allocationRows ?? [];
  const placards = placardsFromAllocationRows(
    rows as {
      id: string;
      country: string | null;
      user_id: string | null;
      display_name_override: string | null;
      display_pronouns_override: string | null;
      display_school_override: string | null;
      profiles: ProfileEmbed | ProfileEmbed[] | null;
    }[]
  );

  let dais = daisFromChairAllocations(
    rows as {
      country: string | null;
      user_id: string | null;
      display_name_override: string | null;
      profiles: ProfileEmbed | ProfileEmbed[] | null;
    }[]
  );
  if (!dais) {
    dais = daisFromChairNamesField(options.chairNamesHint);
  }
  if (!dais) {
    const { data: staff } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in("role", ["chair", "smt", "admin"]);
    const chairs = (staff ?? []).filter((p) => p.role === "chair");
    const smt = (staff ?? []).filter((p) => p.role === "smt" || p.role === "admin");
    dais = [
      {
        title: "Chair",
        name: chairs[0]?.name ?? null,
        showGavel: true,
        profileId: chairs[0]?.id ?? null,
      },
      {
        title: "Vice-Chair",
        name: chairs[1]?.name ?? smt[0]?.name ?? null,
        showGavel: true,
        profileId: chairs[1]?.id ?? smt[0]?.id ?? null,
      },
      {
        title: "Rapporteur",
        name: chairs[2]?.name ?? smt[1]?.name ?? null,
        showGavel: true,
        profileId: chairs[2]?.id ?? smt[1]?.id ?? null,
      },
    ];
  }

  const delegates = options.includeDelegatesForStaff
    ? (
        await supabase.from("profiles").select("id, name").eq("role", "delegate").order("name").limit(500)
      ).data ?? []
    : [];

  const staffAllocations: StaffAllocationRow[] = sortRowsByAllocationCountry(rows).map((r) => ({
    id: r.id as string,
    country: r.country as string | null,
    user_id: r.user_id as string | null,
    display_name_override: r.display_name_override as string | null,
    display_pronouns_override: r.display_pronouns_override as string | null,
    display_school_override: r.display_school_override as string | null,
  }));

  return {
    conference,
    placards,
    dais,
    staffAllocations,
    delegates: delegates as { id: string; name: string | null }[],
  };
}
