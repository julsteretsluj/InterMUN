// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth-error-message";
import { authRetryDelayMs, isRetryableAuthError } from "@/lib/auth-retry";
import { markNavigationLoading } from "@/lib/navigation-loading";

/** After password is set, send invitees into the existing conference-code gate. */
const AFTER_PASSWORD_PATH = "/event-gate";

export function AuthSetPasswordClient() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: userError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userError || !data.user) {
          setEmail(null);
          setError("Open your invite link again to set a password.");
          return;
        }
        setEmail(data.user.email ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(
          formatAuthError(
            err,
            "Could not confirm your session. Open your invite link again."
          )
        );
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don’t match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError("Your invite session expired. Open the invite link again.");
        return;
      }
      let updateError: unknown = null;
      for (let i = 0; i < 5; i++) {
        const result = await supabase.auth.updateUser({ password });
        updateError = result.error;
        if (!result.error) {
          updateError = null;
          break;
        }
        if (!isRetryableAuthError(result.error) || i >= 4) break;
        await new Promise((r) => setTimeout(r, authRetryDelayMs(i, 1500, 12_000)));
      }
      if (updateError) {
        setError(
          formatAuthError(
            updateError,
            "Could not save your password just now. Try again in a moment."
          )
        );
        return;
      }
      markNavigationLoading();
      // Join conference / committee next (codes), not a deep dashboard jump.
      router.replace(AFTER_PASSWORD_PATH);
      router.refresh();
    } catch (err) {
      setError(
        formatAuthError(
          err,
          "Could not save your password just now. Try again in a moment."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1D1D1F]">
          Set your password
        </h1>
        <p className="mt-2 text-[15px] text-[#6E6E73]">Checking your invite session…</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1D1D1F]">
          Set your password
        </h1>
        <p className="text-[15px] leading-relaxed text-[#6E6E73]">
          {error || "Open your invite link again to set a password."}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0077ED]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1D1D1F]">
          Set your password
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6E6E73]">
          Choose a password for <span className="text-[#1D1D1F]">{email}</span>, then
          join your conference with the codes from your organisers.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#1D1D1F]">Password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#007AFF]"
            required
            minLength={8}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#1D1D1F]">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#007AFF]"
            required
            minLength={8}
          />
        </label>
        {error ? (
          <p className="text-sm text-[#FF3B30]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save password and join conference"}
        </button>
      </form>
    </div>
  );
}
