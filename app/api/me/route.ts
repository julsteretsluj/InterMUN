import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, profile_picture_url")
    .eq("id", user.id)
    .maybeSingle();

  return Response.json({
    configuredSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profile?.id ?? null,
      role: profile?.role ?? null,
      profile_picture_url: profile?.profile_picture_url ?? null,
    },
  });
}

