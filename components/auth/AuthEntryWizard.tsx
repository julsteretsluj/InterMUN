"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Armchair, Building2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAppName } from "@/lib/branding";
import { INTERMUN_ENTRY_ROLE_KEY, type InterMunEntryRole } from "@/lib/entry-role";
import { resolveDashboardPathAfterAuth } from "@/lib/entry-role-redirect";

type Step = "welcome" | "role" | "account";

/** Ring segment colors (color-wheel order: top → clockwise matches pointer angle). */
const ROLE_RING_HEX = ["#1DB954", "#3366FF", "#FF00E5"] as const;

const ROLES: {
  id: InterMunEntryRole;
  label: string;
  hint: string;
  Icon: LucideIcon;
  /** Center icon tint */
  accentHex: string;
}[] = [
  { id: "chair", label: "Chair", hint: "(the dais)", Icon: Armchair, accentHex: ROLE_RING_HEX[0]! },
  { id: "delegate", label: "Delegate", hint: "(your committee)", Icon: Users, accentHex: ROLE_RING_HEX[1]! },
  { id: "secretariat", label: "Secretariat", hint: "(event staff)", Icon: Building2, accentHex: ROLE_RING_HEX[2]! },
];

function roleRingConicGradient(): string {
  const n = ROLES.length;
  const seg = 360 / n;
  const parts = ROLE_RING_HEX.map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg}deg`).join(", ");
  return `conic-gradient(from -90deg, ${parts})`;
}

function angleFromPointer(cx: number, cy: number, px: number, py: number): number {
  const rad = Math.atan2(py - cy, px - cx);
  let deg = (rad * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

function angleToRoleIndex(angle: number, count: number): number {
  const segment = 360 / count;
  return Math.min(count - 1, Math.floor(angle / segment));
}

export function AuthEntryWizard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const appName = getAppName();
  const [step, setStep] = useState<Step>("welcome");
  const [roleIndex, setRoleIndex] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedRole = ROLES[roleIndex] ?? ROLES[0]!;
  const RoleIcon = selectedRole.Icon;
  const ringGradient = useMemo(() => roleRingConicGradient(), []);

  const snapToIndex = useCallback((idx: number) => {
    const n = ROLES.length;
    const i = ((idx % n) + n) % n;
    setRoleIndex(i);
  }, []);

  const updateAngleToPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = dialRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const angle = angleFromPointer(cx, cy, clientX, clientY);
      snapToIndex(angleToRoleIndex(angle, ROLES.length));
    },
    [snapToIndex]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    updateAngleToPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateAngleToPointer(e.clientX, e.clientY);
  };

  const endPointer = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const cycle = (delta: number) => {
    snapToIndex(roleIndex + delta);
  };

  async function handleLoginSubmit(e: React.FormEvent) {
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
    const { data: authData, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }
    const uid = authData.user?.id;
    setLoading(false);
    if (uid) {
      const next = await resolveDashboardPathAfterAuth(supabase, uid);
      router.push(next);
      router.refresh();
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
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
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }
    const uid = data.user?.id;
    const session = data.session;
    setLoading(false);
    if (session && uid) {
      const next = await resolveDashboardPathAfterAuth(supabase, uid);
      router.push(next);
      router.refresh();
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  const nRoles = ROLES.length;

  return (
    <div className="w-full">
      {step === "welcome" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-white/10 dark:bg-brand-paper/95 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] md:p-10 text-center space-y-8">
          <div
            className="mx-auto h-1.5 w-20 max-w-[90%] rounded-full bg-gradient-to-r from-logo-magenta via-brand-accent to-logo-cyan"
            aria-hidden
          />
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-brand-navy tracking-tight">
            Enter {appName}
          </h1>
          <p className="text-sm text-brand-muted max-w-sm mx-auto">
            {mode === "signup"
              ? "Conference materials, committee room, and session floor — create an account after choosing how you participate."
              : "Conference materials, committee room, and session floor — sign in after choosing how you participate."}
          </p>
          <button
            type="button"
            onClick={() => setStep("role")}
            className="mun-btn-primary w-full max-w-xs mx-auto rounded-xl py-3.5 text-base font-semibold"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === "role" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg md:p-10 dark:border-white/10 dark:bg-brand-paper/95 w-full max-w-4xl mx-auto">
          <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="text-sm text-brand-muted hover:text-brand-navy inline-flex items-center gap-1 mb-2"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                Back
              </button>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-navy">What is your role?</h2>
              <p className="text-brand-navy text-sm md:text-base">Move the circle to select the respective role.</p>
              <button
                type="button"
                onClick={() => {
                  const id = ROLES[roleIndex]?.id;
                  if (id && typeof window !== "undefined") {
                    sessionStorage.setItem(INTERMUN_ENTRY_ROLE_KEY, id);
                  }
                  setStep("account");
                }}
                className="mt-4 rounded-xl bg-logo-cyan/25 px-8 py-3 text-base font-semibold text-logo-blue hover:bg-logo-cyan/35 transition-colors border border-logo-cyan/30"
              >
                Confirm
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => cycle(-1)}
                  className="rounded-full border border-brand-navy/15 p-2 text-brand-navy hover:bg-brand-navy/5 dark:border-white/20"
                  aria-label="Previous role"
                >
                  <ChevronLeft className="size-6" />
                </button>

                <div
                  ref={dialRef}
                  role="slider"
                  aria-valuenow={roleIndex}
                  aria-valuemin={0}
                  aria-valuemax={nRoles - 1}
                  aria-label="Select role"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      cycle(1);
                    }
                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      cycle(-1);
                    }
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endPointer}
                  onPointerCancel={endPointer}
                  className="relative size-[min(18rem,85vw)] shrink-0 cursor-grab touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 active:cursor-grabbing drop-shadow-[0_12px_28px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
                >
                  {/* Color-wheel ring */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_2px_14px_rgba(0,0,0,0.18)]"
                    style={{ background: ringGradient }}
                    aria-hidden
                  />
                  {/* Inner disc (donut hole) */}
                  <div className="pointer-events-none absolute inset-[14px] rounded-full bg-white shadow-[inset_0_2px_12px_rgba(0,0,0,0.06)] dark:bg-discord-app dark:shadow-inner" />

                  <div className="pointer-events-none absolute inset-[14px] flex flex-col items-center justify-center rounded-full p-4 text-center">
                    <RoleIcon
                      className="size-12 md:size-14 mb-2"
                      strokeWidth={1.25}
                      style={{ color: selectedRole.accentHex }}
                    />
                    <p className="font-display text-2xl md:text-3xl font-bold text-brand-navy">{selectedRole.label}</p>
                    <p className="text-sm italic text-brand-navy/85">{selectedRole.hint}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => cycle(1)}
                  className="rounded-full border border-brand-navy/15 p-2 text-brand-navy hover:bg-brand-navy/5 dark:border-white/20"
                  aria-label="Next role"
                >
                  <ChevronRight className="size-6" />
                </button>
              </div>
              <p className="text-xs text-brand-muted text-center max-w-xs">
                Drag around the ring or use the arrows / arrow keys to change role.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {step === "account" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-white/10 dark:bg-brand-paper/95 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] md:p-10">
          <div
            className="mx-auto mb-6 h-1.5 w-20 max-w-[90%] rounded-full bg-gradient-to-r from-logo-magenta via-brand-accent to-logo-cyan"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => setStep("role")}
            className="mb-4 text-sm text-brand-muted hover:text-brand-navy inline-flex items-center gap-1"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            Back to role
          </button>
          <h2 className="font-display text-xl font-semibold text-center text-brand-navy mb-6">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <form onSubmit={mode === "login" ? handleLoginSubmit : handleSignupSubmit} className="space-y-4">
            {mode === "signup" ? (
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
            ) : null}
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
                minLength={mode === "signup" ? 6 : undefined}
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
              className="mun-btn-primary w-full rounded-lg py-3 text-base"
            >
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Sign up"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-brand-muted">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="mun-link font-medium no-underline hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="mun-link font-medium no-underline hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
