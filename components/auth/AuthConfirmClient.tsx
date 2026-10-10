// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { requestFreshSetPasswordLink } from "@/app/actions/authConfirmResend";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth-error-message";
import {
  authRetryDelayMs,
  isRetryableAuthError,
  isTerminalOtpError,
} from "@/lib/auth-retry";
import { markNavigationLoading } from "@/lib/navigation-loading";

const OTP_TYPES = new Set<string>([
  "invite",
  "signup",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/** Spaced retries so intermittent GoTrue 504s can clear between attempts. */
const VERIFY_ATTEMPTS = 8;
const VERIFY_BASE_DELAY_MS = 2000;
const VERIFY_MAX_DELAY_MS = 25_000;

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
      : "This invite link is missing its security token. Ask your organisers for a fresh invite, or request a new link below."
  );
  const [attempt, setAttempt] = useState(0);
  const [tokenBurned, setTokenBurned] = useState(!tokenHash);
  const [authDown, setAuthDown] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  async function acceptInvite() {
    if (!tokenHash || tokenBurned || startedRef.current) return;
    startedRef.current = true;
    setStatus("working");
    setAuthDown(false);
    setResendNote(null);
    setMessage("Accepting your invite…");

    const otpType = (OTP_TYPES.has(type) ? type : "invite") as EmailOtpType;

    try {
      const supabase = createClient();
      for (let i = 0; i < VERIFY_ATTEMPTS; i++) {
        setAttempt(i + 1);
        setMessage(
          i === 0
            ? "Accepting your invite…"
            : `Sign-in is busy — waiting, then retrying (${i + 1}/${VERIFY_ATTEMPTS})…`
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

        if (isTerminalOtpError(error)) {
          startedRef.current = false;
          setTokenBurned(true);
          setAuthDown(false);
          setStatus("error");
          setMessage(
            "This invite link was already used or has expired. Request a fresh set-password email below — retrying the same link will not work."
          );
          return;
        }

        const retryable = isRetryableAuthError(error);
        if (!retryable || i >= VERIFY_ATTEMPTS - 1) {
          startedRef.current = false;
          setAuthDown(retryable);
          setStatus("error");
          setMessage(
            retryable
              ? "Sign-in stayed overloaded after several tries. Wait a few minutes, then Try again with this link — or email yourself a fresh link so you are not stuck on a spent token."
              : formatAuthError(
                  error,
                  "We couldn’t accept this invite just now. Wait a moment and try again, or ask for a fresh invite link."
                )
          );
          return;
        }

        await sleep(authRetryDelayMs(i, VERIFY_BASE_DELAY_MS, VERIFY_MAX_DELAY_MS));
      }
    } catch (err) {
      startedRef.current = false;
      const retryable = isRetryableAuthError(err);
      setAuthDown(retryable);
      setStatus("error");
      setMessage(
        retryable
          ? "Sign-in stayed overloaded after several tries. Wait a few minutes, then Try again — or email yourself a fresh link."
          : formatAuthError(
              err,
              "We couldn’t reach authentication just now. Wait a moment and try again."
            )
      );
    }
  }

  async function sendFreshLink() {
    if (resendBusy) return;
    setResendBusy(true);
    setResendNote(null);
    try {
      const result = await requestFreshSetPasswordLink(resendEmail);
      setResendNote(result.message);
      if (result.ok) {
        setTokenBurned(true);
        setAuthDown(false);
      } else if (result.authDown) {
        setAuthDown(true);
      }
    } catch {
      setResendNote("Could not request a fresh link just now. Wait a minute and try again.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#1D1D1F]">
          {status === "working"
            ? "Opening InterMUN"
            : status === "error"
              ? tokenBurned
                ? "Need a fresh link"
                : authDown
                  ? "Sign-in is overloaded"
                  : "Invite needs a retry"
              : "Set your password"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6E6E73]">{message}</p>
        {status === "working" && attempt > 0 ? (
          <p className="mt-2 text-xs text-[#AEAEB2]">
            Attempt {attempt} of {VERIFY_ATTEMPTS}
            {attempt > 1 ? " · longer waits help Auth recover" : ""}
          </p>
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
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {!tokenBurned ? (
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
            ) : null}
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-[980px] border border-[rgba(60,60,67,0.29)] bg-[#F2F2F7] px-5 py-2.5 text-[15px] font-semibold text-[#1D1D1F] transition-colors hover:bg-[#E5E5EA]"
            >
              Go to sign in
            </Link>
          </div>

          <div className="rounded-[16px] border border-[#D1D1D6] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
              Email me a fresh link
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6E6E73]">
              Uses a new one-time token (not the link you already opened). Check spam for mail from
              Information @ SEAMUN I 2027.
            </p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-sm font-medium text-[#1D1D1F]">Registered email</span>
              <input
                type="email"
                autoComplete="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full rounded-[12px] border border-[#D1D1D6] bg-white px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#007AFF]"
              />
            </label>
            <button
              type="button"
              disabled={resendBusy || !resendEmail.trim()}
              className="mt-3 inline-flex w-full items-center justify-center rounded-[980px] bg-[#007AFF] px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0077ED] disabled:opacity-60"
              onClick={() => {
                void sendFreshLink();
              }}
            >
              {resendBusy ? "Sending…" : "Send fresh set-password email"}
            </button>
            {resendNote ? (
              <p className="mt-2 text-sm leading-relaxed text-[#6E6E73]" role="status">
                {resendNote}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
