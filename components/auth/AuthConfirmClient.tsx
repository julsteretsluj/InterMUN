// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth-error-message";
import { isRetryableAuthError } from "@/lib/auth-retry";
import { markNavigationLoading } from "@/lib/navigation-loading";

const OTP_TYPES = new Set<string>([
  "invite",
  "signup",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Do NOT verify on mount — mail scanners prefetch invite URLs and would burn
 * one-time token_hash before the real recipient clicks.
 */
export function AuthConfirmClient({
  tokenHash,
  type,
  nextPath,
}: {
  tokenHash: string;
  type: string;
  nextPath: string;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [status, setStatus] = useState<"ready" | "working" | "error">(
    tokenHash ? "ready" : "error"
  );
  const [message, setMessage] = useState(
    tokenHash
      ? "Your InterMUN account is ready. Continue to set your password, then join your conference with the organiser codes."
      : "This invite link is missing its security token. Ask your organisers for a fresh invite."
  );
  const [attempt, setAttempt] = useState(0);

  async function acceptInvite() {
    if (!tokenHash || startedRef.current) return;
    startedRef.current = true;
    setStatus("working");
    setMessage("Accepting your invite…");

    const otpType = (OTP_TYPES.has(type) ? type : "invite") as EmailOtpType;

    try {
      const supabase = createClient();
      const maxAttempts = 4;
      for (let i = 0; i < maxAttempts; i++) {
        setAttempt(i + 1);
        setMessage(
          i === 0
            ? "Accepting your invite…"
            : `Auth is busy — retrying (${i + 1}/${maxAttempts})…`
        );
        const { error } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: tokenHash,
        });
        if (!error) {
          markNavigationLoading();
          router.replace(nextPath);
          return;
        }
        const final = !isRetryableAuthError(error);
        if (final || i >= maxAttempts - 1) {
          startedRef.current = false;
          setStatus("error");
          setMessage(
            formatAuthError(
              error,
              "We couldn’t accept this invite just now. Wait a moment and try again, or ask for a fresh invite link."
            )
          );
          return;
        }
        await sleep(1200 * (i + 1));
      }
    } catch (err) {
      startedRef.current = false;
      setStatus("error");
      setMessage(
        formatAuthError(
          err,
          "We couldn’t reach authentication just now. Wait a moment and try again."
        )
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1D1D1F]">
          {status === "working"
            ? "Opening InterMUN"
            : status === "error"
              ? "Invite needs a retry"
              : "Set your password"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6E6E73]">{message}</p>
        {status === "working" && attempt > 0 ? (
          <p className="mt-2 text-xs text-[#AEAEB2]">Attempt {attempt}</p>
        ) : null}
      </div>

      {status === "ready" ? (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0077ED]"
          onClick={() => {
            void acceptInvite();
          }}
        >
          Continue to set password
        </button>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0077ED]"
            onClick={() => {
              startedRef.current = false;
              void acceptInvite();
            }}
          >
            Try again
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-[980px] border border-[rgba(60,60,67,0.29)] bg-[#F2F2F7] px-5 py-2.5 text-[15px] font-semibold text-[#1D1D1F] transition-colors hover:bg-[#E5E5EA]"
          >
            Go to sign in
          </Link>
        </div>
      ) : null}
    </div>
  );
}
