import Link from "next/link";
import { BrandWordmark } from "@/components/BrandWordmark";

export default function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-brand-cream via-brand-paper to-[#e4ddd4]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(184,148,30,0.08),transparent)] pointer-events-none" />
      <div className="relative w-full max-w-lg space-y-8">
        <BrandWordmark />
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] p-8 md:p-10 space-y-4">
          <div className="h-1 w-16 rounded-full bg-brand-accent" aria-hidden />
          <h1 className="font-display text-2xl font-semibold text-brand-navy">
            Supabase is not configured
          </h1>
          <p className="text-brand-muted leading-relaxed">
            This deployment is missing the public Supabase environment variables.
            Add them in your host (for example Vercel → Project → Settings →
            Environment Variables), then redeploy:
          </p>
          <ul className="list-disc list-inside text-sm text-brand-navy space-y-1.5">
            <li>
              <code className="bg-brand-cream px-1.5 py-0.5 rounded text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>
            </li>
            <li>
              <code className="bg-brand-cream px-1.5 py-0.5 rounded text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>
            </li>
          </ul>
          <p className="text-sm text-brand-muted leading-relaxed">
            Values are in Supabase → Project Settings → API. Use the same names
            for Production and Preview if you use preview deployments.
          </p>
          <Link
            href="/login"
            className="inline-block text-brand-accent font-medium hover:text-brand-navy underline-offset-2 hover:underline"
          >
            Try sign in again after redeploying
          </Link>
        </div>
      </div>
    </div>
  );
}
