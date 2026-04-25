import { AuthEntryWizard } from "@/components/auth/AuthEntryWizard";

type Params = { next?: string };

function normalizeNextPath(value: string | undefined): string | undefined {
  const next = String(value ?? "").trim();
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { next } = await searchParams;
  return <AuthEntryWizard mode="signup" nextPath={normalizeNextPath(next)} />;
}
