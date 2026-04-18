"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    const uid = authData.user?.id;
    let next = "/profile";
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      if (prof?.role === "admin") next = "/admin";
      else if (prof?.role === "smt") next = "/smt";
    }
    setLoading(false);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/95 p-10 shadow-xl shadow-slate-200/50 backdrop-blur-sm dark:border-white/10 dark:bg-brand-paper/95 dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.4)] md:p-14 lg:p-16">
      <div className="mx-auto mb-8 h-1.5 w-24 rounded-full bg-brand-accent md:w-28" aria-hidden />
      <h2 className="font-display text-2xl font-semibold text-center text-brand-navy mb-8 md:text-3xl">
        Sign in
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-7">
        <div>
          <label className="block text-sm font-medium uppercase tracking-wider text-brand-muted mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mun-field rounded-xl px-4 py-4 text-base"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium uppercase tracking-wider text-brand-muted mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mun-field rounded-xl px-4 py-4 text-base"
            required
          />
        </div>
        {error && (
          <p className="text-base text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-accent py-4 text-lg font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50 dark:bg-brand-accent"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-8 text-center text-base text-brand-muted md:mt-10">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="mun-link font-medium no-underline hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
