import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Coins,
  LogIn,
  PiggyBank,
  Target,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup";

/*
 * Double-slider auth card (after the classic "double slider sign in/up" technique).
 *
 * Desktop (md+): a two-column card. Both forms stack in the start column; the branded
 * overlay covers the end column. Switching to sign-up slides the overlay across to the
 * start column while both forms slide to the end column, so the overlay passes over —
 * and hides — the form swap. The overlay's inner strip is twice as wide and counter-
 * slides by half, swapping which copy panel shows through the overlay's window.
 *
 * Direction: every horizontal move is multiplied by --auth-dir (1 in LTR, -1 in RTL),
 * so RTL starts with the form on the right / panel on the left and mirrors each move.
 *
 * Mobile: no overlay; only the active form renders, entering with a short fade+slide,
 * and a compact switch row sits under it.
 *
 * All motion is CSS transitions on `translate`/`opacity` (Tailwind v4 translate-x-*
 * sets the `translate` property). Transitions retarget from their current value, so
 * rapid toggling never strands the card mid-state. The global prefers-reduced-motion
 * rule in styles.css zeroes durations and delays, which removes the slide entirely.
 */

// Forms slide for 600ms. The outgoing form fades out over the first half (while the
// overlay covers it); the incoming one fades in over the second half.
const PANE_OUT = "[transition:translate_600ms_ease-in-out,opacity_300ms_ease-in-out]";
const PANE_IN = "[transition:translate_600ms_ease-in-out,opacity_300ms_ease-in-out_300ms]";
const SLIDE = "[transition:translate_600ms_ease-in-out]";

interface AuthSwitchProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthSwitch({ mode, onModeChange }: AuthSwitchProps) {
  const isSignUp = mode === "signup";
  // Email is the only value carried across modes; passwords stay per-form, in memory.
  const [email, setEmail] = useState("");
  const signInFirstField = useRef<HTMLInputElement | null>(null);
  const signUpFirstField = useRef<HTMLInputElement | null>(null);

  // Move focus into the newly active form after a user-initiated switch (never on
  // first mount). The previous focus target — the switch button — has just become
  // inert, so without this focus would fall back to <body>.
  const previousMode = useRef(mode);
  useEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    const target = mode === "signup" ? signUpFirstField.current : signInFirstField.current;
    target?.focus({ preventScroll: true });
  }, [mode]);

  const paneClass = (active: boolean) =>
    cn(
      "px-6 py-10 sm:px-10 md:col-start-1 md:row-start-1 md:flex md:flex-col md:justify-center md:px-12 md:py-12",
      active
        ? cn(
            "relative z-20 opacity-100",
            PANE_IN,
            "max-md:animate-in max-md:fade-in max-md:slide-in-from-bottom-2 max-md:[animation-duration:250ms]",
          )
        : cn("pointer-events-none relative z-10 opacity-0 max-md:hidden", PANE_OUT),
      isSignUp && "md:translate-x-[calc(var(--auth-dir)*100%)]",
    );

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <Link
        to="/"
        aria-label="Kaspii — חזרה לדף הבית"
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Coins className="size-5" aria-hidden />
        </span>
        <span className="text-lg font-bold text-foreground">
          <bdi>Kaspii</bdi>
        </span>
      </Link>

      <div className="relative w-full overflow-hidden rounded-3xl border bg-card shadow-xl [--auth-dir:1] rtl:[--auth-dir:-1] md:grid md:min-h-[600px] md:grid-cols-2">
        <div className={paneClass(!isSignUp)} inert={isSignUp}>
          <SignInForm email={email} onEmailChange={setEmail} firstFieldRef={signInFirstField} />
        </div>
        <div className={paneClass(isSignUp)} inert={!isSignUp}>
          <SignUpForm
            email={email}
            onEmailChange={setEmail}
            onBackToSignIn={() => onModeChange("signin")}
            firstFieldRef={signUpFirstField}
          />
        </div>

        {/* Branded overlay (desktop only): a window onto a double-width strip. */}
        <div
          className={cn(
            "absolute inset-y-0 start-1/2 z-30 hidden w-1/2 overflow-hidden md:block",
            SLIDE,
            isSignUp && "translate-x-[calc(var(--auth-dir)*-100%)]",
          )}
        >
          <div
            className={cn(
              "relative -start-full flex h-full w-[200%] bg-linear-to-br from-primary via-primary to-accent-foreground text-primary-foreground",
              SLIDE,
              isSignUp && "translate-x-[calc(var(--auth-dir)*50%)]",
            )}
          >
            <OverlayDecor />
            {/* Start half: shown while signing up — invites returning users back. */}
            <OverlayPanel
              inert={!isSignUp}
              className={cn(SLIDE, !isSignUp && "translate-x-[calc(var(--auth-dir)*-20%)]")}
              icon={LogIn}
              title="ברוכים השבים!"
              body="כבר יש לכם חשבון? התחברו כדי להמשיך מאיפה שעצרתם."
              actionLabel="התחברות"
              onAction={() => onModeChange("signin")}
              preview={<GoalPreview />}
            />
            {/* End half: shown while signing in — invites new families to sign up. */}
            <OverlayPanel
              inert={isSignUp}
              className={cn(SLIDE, isSignUp && "translate-x-[calc(var(--auth-dir)*20%)]")}
              icon={UserPlus}
              title="חדשים ב-Kaspii?"
              body="פתחו חשבון הורה והתחילו לבנות יחד הרגלי חיסכון במשפחה."
              actionLabel="הרשמה"
              onAction={() => onModeChange("signup")}
              preview={<RewardPreview />}
            />
          </div>
        </div>

        {/* Mobile: compact switch row replaces the sliding overlay. */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 border-t px-6 py-3 text-sm text-muted-foreground md:hidden">
          <span>{isSignUp ? "כבר יש לכם חשבון?" : "אין לכם חשבון?"}</span>
          <Button
            type="button"
            variant="link"
            className="h-11 px-2 font-semibold"
            onClick={() => onModeChange(isSignUp ? "signin" : "signup")}
          >
            {isSignUp ? <LogIn aria-hidden /> : <UserPlus aria-hidden />}
            {isSignUp ? "התחברות" : "הרשמה"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OverlayPanelProps {
  inert: boolean;
  className?: string;
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  preview: ReactNode;
}

function OverlayPanel({
  inert,
  className,
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  preview,
}: OverlayPanelProps) {
  return (
    <div
      inert={inert}
      className={cn(
        "relative z-10 flex w-1/2 flex-col items-center justify-center gap-5 px-12 text-center",
        className,
      )}
    >
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      <p className="max-w-xs text-base leading-relaxed text-primary-foreground/85">{body}</p>
      {preview}
      <Button
        type="button"
        variant="outline"
        size="touch"
        onClick={onAction}
        className="min-w-40 rounded-full border-primary-foreground/70 bg-transparent px-8 text-base font-semibold text-primary-foreground shadow-none hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary-foreground"
      >
        <Icon aria-hidden />
        {actionLabel}
      </Button>
    </div>
  );
}

/** Soft light ribbons + glow painted on the moving strip (purely decorative). */
function OverlayDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/4 start-[8%] h-[150%] w-28 rotate-[28deg] rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="absolute -top-1/4 start-[30%] h-[150%] w-16 rotate-[28deg] rounded-full bg-primary-foreground/15 blur-xl" />
      <div className="absolute -top-1/4 start-[62%] h-[150%] w-24 rotate-[28deg] rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="absolute -top-1/4 start-[84%] h-[150%] w-12 rotate-[28deg] rounded-full bg-primary-foreground/15 blur-xl" />
      <div className="absolute -bottom-24 start-1/4 size-80 rounded-full bg-ks-cyan-soft/25 blur-3xl" />
      <div className="absolute -top-24 end-1/4 size-72 rounded-full bg-accent-foreground/40 blur-3xl" />
    </div>
  );
}

const glassCard =
  "w-full max-w-xs rounded-2xl border border-primary-foreground/25 bg-primary-foreground/15 p-4 text-start shadow-lg backdrop-blur-md";

/** Illustrative product preview (not a testimonial): what a task approval looks like. */
function RewardPreview() {
  return (
    <div aria-hidden className={glassCard}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="size-4 shrink-0" />
        משימה אושרה
      </div>
      <p className="mt-1 text-xs text-primary-foreground/75">סידור החדר</p>
      <div className="mt-3 flex items-center gap-3 text-sm font-semibold tabular-nums">
        <span className="flex items-center gap-1">
          <Coins className="size-4 text-coin" />
          +9 לארנק
        </span>
        <span className="flex items-center gap-1">
          <PiggyBank className="size-4" />
          +1 לחיסכון
        </span>
      </div>
    </div>
  );
}

/** Illustrative product preview: progress toward a savings goal. */
function GoalPreview() {
  return (
    <div aria-hidden className={glassCard}>
      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <Target className="size-4 shrink-0" />
          מטרה: אופניים
        </span>
        <span className="tabular-nums">60%</span>
      </div>
      {/* Width-based bar fills from the inline start (RTL-safe). */}
      <div className="mt-3 h-2 rounded-full bg-primary-foreground/20">
        <div className="h-full w-3/5 rounded-full bg-primary-foreground" />
      </div>
      <p className="mt-2 text-xs text-primary-foreground/75 tabular-nums">120 מתוך 200 מטבעות</p>
    </div>
  );
}
