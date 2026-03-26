"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let supabase;
    try {
      supabase = createClient();
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to authentication (check Supabase env vars)."
      );
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-brand-paper/95 shadow-[0_20px_50px_-12px_rgba(10,22,40,0.18)] backdrop-blur-sm p-8 md:p-10">
      <div className="h-1 w-16 rounded-full bg-brand-gold mx-auto mb-6" aria-hidden />
      <h2 className="font-display text-xl font-semibold text-center text-brand-navy mb-6">
        Create account
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-brand-muted mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-brand-navy/15 bg-white text-brand-navy placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold"
            required
            minLength={6}
          />
        </div>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-brand-paper text-brand-navy font-medium hover:bg-brand-navy-soft transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-brand-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-brand-gold font-medium hover:text-brand-navy underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
