import { Link } from "@tanstack/react-router";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { ArrowDown, Check, Coins, PiggyBank, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { ctaInteractions, deviceFrameReveal, easeOutSoft } from "./motion/variants";
import { useCountUp } from "./use-count-up";

const BASE_BALANCE = 128;
// Wallet gain after the automatic 10% savings split on a +10 task (+9 wallet, +1 savings).
const WALLET_GAIN = 9;
const FINAL_BALANCE = BASE_BALANCE + WALLET_GAIN;

/**
 * Drives the looping in-app demo: idle → task completes → (toast + balance bump) →
 * hold → reset → repeat. Only loops while `run` is true (in view, motion allowed).
 * When paused with `staticDone` it settles on the completed state for a readable
 * reduced-motion baseline.
 */
function useDemoLoop(run: boolean, staticDone: boolean): boolean {
  const [done, setDone] = useState(staticDone);

  useEffect(() => {
    if (!run) {
      if (staticDone) setDone(true);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      setDone(false);
      const complete = setTimeout(() => setDone(true), 1200);
      const restart = setTimeout(cycle, 4200);
      timers = [complete, restart];
    };
    cycle();
    return () => timers.forEach((t) => clearTimeout(t));
  }, [run, staticDone]);

  return done;
}

export function Hero() {
  return (
    <section
      id="main"
      aria-labelledby="hero-headline"
      className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28"
    >
      <CyanWash />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 md:grid-cols-[1.05fr_1fr] md:gap-16 md:px-8">
        <div className="text-start">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              מערכת תגמולים למשפחות
            </span>
          </div>

          <h1
            id="hero-headline"
            className="mt-5 text-[2.5rem] leading-[1.05] font-bold tracking-tight text-foreground md:text-6xl"
          >
            המשפחה לומדת לחסוך — <span className="text-primary">יחד.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            הורים מגדירים משימות. ילדים צוברים מטבעות. אחוז מכל תגמול הולך אוטומטית לחיסכון — בלי
            לזכור, בלי להתווכח.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <m.div {...ctaInteractions}>
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                התחל בחינם
              </Link>
            </m.div>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
            >
              איך זה עובד
              <ArrowDown className="h-4 w-4" aria-hidden />
            </a>
          </div>

          <p className="mt-6 max-w-md text-sm text-muted-foreground/80">
            <bdi>Kaspii</bdi> היא סביבת תרגול משפחתית — המטבעות וירטואליים, ההרגל אמיתי.
          </p>
        </div>

        <m.div
          variants={deviceFrameReveal}
          initial="hidden"
          animate="visible"
          className="relative mx-auto w-full max-w-md md:max-w-none"
        >
          <HeroDevice />
        </m.div>
      </div>
    </section>
  );
}

function HeroDevice() {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const run = !reduceMotion && inView;
  const done = useDemoLoop(run, reduceMotion);
  const balance = useCountUp(done ? FINAL_BALANCE : BASE_BALANCE, {
    play: run && done,
    from: BASE_BALANCE,
  });

  const toast = <ApprovalToast />;

  return (
    <div ref={ref} className="relative">
      <DeviceFrame done={done} balance={balance} />

      {reduceMotion ? (
        <div className="absolute -bottom-4 start-2 z-10 md:-bottom-6 md:start-[-2rem]">{toast}</div>
      ) : (
        <AnimatePresence>
          {done ? (
            <m.div
              key="toast"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="absolute -bottom-4 start-2 z-10 md:-bottom-6 md:start-[-2rem]"
            >
              {toast}
            </m.div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  );
}

function CyanWash() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background: "radial-gradient(60% 50% at 30% 35%, var(--ks-cyan-soft) 0%, transparent 70%)",
      }}
    />
  );
}

function DeviceFrame({ done, balance }: { done: boolean; balance: number }) {
  return (
    <div
      className={cn(
        "relative isolate rounded-[1.75rem] border border-[color:var(--ks-navy-deep)]/10 bg-card p-3 shadow-[0_1px_2px_rgba(20,30,60,0.06),0_24px_60px_-30px_rgba(20,30,60,0.18)]",
      )}
    >
      <div className="overflow-hidden rounded-2xl bg-background">
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              נ
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">נועם</p>
              <p className="text-[11px] text-muted-foreground">שלום, איזה כיף שחזרת</p>
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">היום</span>
        </div>

        <div className="mx-4 mt-4 rounded-xl border border-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent p-4">
          <p className="text-[11px] font-medium text-muted-foreground">היתרה שלי</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-3xl font-bold tracking-tight text-foreground"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {balance}
            </span>
            <span className="text-sm font-medium text-muted-foreground">מטבעות</span>
            <span className="ms-auto flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--coin)]/15 text-[color:var(--coin-foreground)]">
              <Coins className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>

        <div className="mt-4 px-4">
          <p className="text-xs font-medium text-muted-foreground">המשימות שלי</p>
        </div>

        <ul className="mx-4 mt-2 mb-4 space-y-2">
          <li className="flex items-center justify-between rounded-lg border border-success/15 bg-success/5 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">סידרתי את החדר</span>
            </div>
            <span className="text-xs font-semibold text-success">+10</span>
          </li>
          <li
            className={cn(
              "flex items-center justify-between rounded-lg border p-3 transition-colors duration-300",
              done ? "border-success/15 bg-success/5" : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-6 w-6 items-center justify-center" aria-hidden>
                <AnimatePresence initial={false}>
                  {done ? (
                    <m.span
                      key="check"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25, ease: easeOutSoft }}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-success/15 text-success"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </m.span>
                  ) : (
                    <m.span
                      key="dot"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                        aria-hidden
                      />
                    </m.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="text-sm font-medium text-foreground">לקרוא 20 דקות</span>
            </div>
            <span
              className={cn(
                "text-xs font-semibold transition-colors duration-300",
                done ? "text-success" : "text-muted-foreground",
              )}
            >
              +10
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ApprovalToast() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-foreground/5 bg-card px-4 py-3 shadow-[0_8px_30px_-12px_rgba(20,30,60,0.18)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-4 w-4" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">המשימה אושרה</p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-[color:var(--coin-foreground)]">
            <Coins className="h-3 w-3" aria-hidden />
            <span style={{ fontFeatureSettings: '"tnum"' }}>+9</span> ארנק
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <PiggyBank className="h-3 w-3" aria-hidden />
            <span style={{ fontFeatureSettings: '"tnum"' }}>+1</span> חיסכון
          </span>
        </p>
      </div>
    </div>
  );
}
