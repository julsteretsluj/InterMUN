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
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-white/10 dark:bg-brand-paper/95 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] md:p-10">
      <div className="mx-auto mb-6 h-1 w-16 rounded-full bg-brand-gold" aria-hidden />
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
            className="mun-field py-2.5"
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
            className="mun-field py-2.5"
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
            className="mun-field py-2.5"
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
          className="w-full rounded-lg bg-brand-gold py-3 font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
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
