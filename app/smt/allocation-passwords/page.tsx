import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MunPageShell } from "@/components/MunPageShell";
import { AllocationCodeGateToggle } from "@/components/allocation/AllocationCodeGateToggle";
import { AllocationPasswordsClient } from "@/app/(dashboard)/chair/allocation-passwords/AllocationPasswordsClient";
import { isSmtRole } from "@/lib/roles";

type ProfileEmbed = { name: string | null } | null;

type AllocRow = {
  id: string;
  country: string;
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[];
};

function embedName(p: ProfileEmbed | ProfileEmbed[]): string | null {
  if (p == null) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row?.name?.trim() || null;
}

export default async function SmtAllocationPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ conference?: string }>;
}) {
  const { conference: conferenceParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isSmtRole(profile?.role)) {
    redirect("/profile");
  }

  const { data: conferences } = await supabase
    .from("conferences")
    .select("id, name, committee")
    .order("created_at", { ascending: false });

  const list = conferences ?? [];
  const conferenceId =
    conferenceParam && list.some((c) => c.id === conferenceParam)
      ? conferenceParam
      : list[0]?.id;

  if (!conferenceId) {
    return (
      <MunPageShell title="Allocation passwords">
        <p className="text-sm text-brand-muted">Create a conference first.</p>
      </MunPageShell>
    );
  }

  const { data: allocData } = await supabase
    .from("allocations")
    .select("id, country, user_id, profiles(name)")
    .eq("conference_id", conferenceId)
    .order("country");

  const rows = (allocData ?? []) as AllocRow[];
  const ids = rows.map((r) => r.id);

  const { data: codeRows } = ids.length
    ? await supabase
        .from("allocation_gate_codes")
        .select("allocation_id, code")
        .in("allocation_id", ids)
    : { data: [] as { allocation_id: string; code: string | null }[] };

  const codeMap = new Map((codeRows ?? []).map((c) => [c.allocation_id, c.code ?? ""]));

  const merged = rows.map((r) => ({
    allocationId: r.id,
    country: r.country?.trim() || "—",
    delegateUserId: r.user_id ?? null,
    code: codeMap.get(r.id) ?? "",
  }));

  const activeConf = list.find((c) => c.id === conferenceId);

  const { data: gateConf } = await supabase
    .from("conferences")
    .select("allocation_code_gate_enabled")
    .eq("id", conferenceId)
    .maybeSingle();

  return (
    <MunPageShell title="Allocation passwords">
      <p className="text-sm text-brand-muted mb-4 max-w-2xl">
        Per-allocation <strong>codes</strong> for placards, binders, or handouts. Optional <strong>third gate</strong>
        : when enabled, each delegate and chair must enter their seat code after committee sign-in. Stored in plain
        text so you can copy this list—treat it like a seating chart (do not share publicly). The shared committee
        password for the second gate is managed from the chair dashboard (dais), not here.
      </p>

      <div className="mb-6 max-w-2xl">
        <AllocationCodeGateToggle
          conferenceId={conferenceId}
          enabled={gateConf?.allocation_code_gate_enabled === true}
        />
      </div>

      {list.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/smt/allocation-passwords?conference=${c.id}`}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                c.id === conferenceId
                  ? "bg-brand-paper text-brand-navy border-brand-navy"
                  : "border-brand-navy/20 text-brand-navy hover:bg-brand-cream"
              }`}
            >
              {c.name}
              {c.committee ? ` — ${c.committee}` : ""}
            </Link>
          ))}
        </div>
      )}

      <AllocationPasswordsClient
        conferenceId={conferenceId}
        conferenceLabel={
          [activeConf?.name, activeConf?.committee].filter(Boolean).join(" — ") || "Conference"
        }
        rows={merged}
      />
    </MunPageShell>
  );
}
