import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import { Check, Coins, PiggyBank } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";
import { easeOutSoft, fadeUp, fadeUpItem, staggerContainer, viewportOnce } from "./motion/variants";
import { useCountUp } from "./use-count-up";
import { useStepCycle } from "./use-step-cycle";

const steps = [
  {
    n: 1,
    title: "הורה מגדיר משימה",
    body: 'לדוגמה: "לסדר את חדר השינה — 10 מטבעות". פותחים, ממלאים, שולחים.',
    Illustration: ParentTaskIllustration,
  },
  {
    n: 2,
    title: 'ילד מסמן "סיימתי!"',
    body: "ההורה רואה את הבקשה ולוחץ אישור או דחייה — בלי לעבור בין מסכים.",
    Illustration: ChildDoneIllustration,
  },
  {
    n: 3,
    title: "התגמול מתחלק אוטומטית",
    body: "אחוז שהגדרת עובר ישר לקופת החיסכון. השאר נכנס לארנק.",
    Illustration: SplitPayoutIllustration,
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion() ?? false;
  const olRef = useRef<HTMLOListElement>(null);
  const inView = useInView(olRef, { amount: 0.4 });
  const run = !reduceMotion && inView;
  const cycle = useStepCycle(steps.length, { run });
  // Reduced motion → no single active step, every card rests in its final state.
  const activeStep = reduceMotion ? -1 : cycle;
  const progress = activeStep <= 0 ? 0 : activeStep / (steps.length - 1);

  return (
    <section id="how-it-works" aria-labelledby="how-headline" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="max-w-2xl"
        >
          <p className="text-sm font-medium text-primary">איך זה עובד</p>
          <h2
            id="how-headline"
            className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            לולאה אחת, ברורה לכולם.
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            שלושה שלבים, חוזרים מדי שבוע — בלי ניירת, בלי לוחות שיש לתחזק.
          </p>
        </m.div>

        <m.ol
          ref={olRef}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="relative mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-6"
        >
          <DesktopConnector progress={progress} reduceMotion={reduceMotion} />
          {steps.map((step, i) => {
            const active = activeStep === i;
            return (
              <m.li
                key={step.n}
                variants={fadeUpItem}
                className={cn(
                  "relative flex flex-col rounded-2xl border border-foreground/5 bg-card p-6",
                  "transition-shadow duration-300 motion-reduce:transition-none",
                  active ? "shadow-lg ring-1 ring-primary/25" : "shadow-none",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold transition-colors duration-300 motion-reduce:transition-none",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-[color:var(--ks-navy-deep)] text-background",
                    )}
                    style={{ fontFeatureSettings: '"tnum"' }}
                    aria-hidden
                  >
                    {step.n}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground md:text-xl">{step.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">{step.body}</p>
                <div className="mt-6 flex-1 overflow-hidden rounded-xl border border-foreground/5 bg-muted/40 p-3">
                  <step.Illustration active={active} />
                </div>
              </m.li>
            );
          })}
        </m.ol>
      </div>
    </section>
  );
}

function DesktopConnector({ progress, reduceMotion }: { progress: number; reduceMotion: boolean }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute start-[12%] end-[12%] top-[4.5rem] hidden h-1 -translate-y-1/2 md:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 1"
    >
      {/* Dashed track (drawn once on enter), right-to-left for RTL. */}
      <m.path
        d="M 100 0.5 L 0 0.5"
        fill="none"
        stroke="var(--ks-navy-deep)"
        strokeOpacity="0.18"
        strokeWidth="1"
        strokeDasharray="3 4"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      {/* Primary progress overlay that flows with the active step. */}
      <m.path
        d="M 100 0.5 L 0 0.5"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: reduceMotion ? 1 : progress }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: easeOutSoft }}
      />
    </svg>
  );
}

function ParentTaskIllustration({ active }: { active: boolean }) {
  return (
    <div className="rounded-lg bg-card p-3">
      <p className="text-[10px] font-medium text-muted-foreground">משימה חדשה</p>
      <div className="mt-2 space-y-2">
        <div className="rounded-md border border-border bg-background px-2.5 py-1.5">
          <p className="text-[10px] text-muted-foreground">כותרת</p>
          <p className="text-xs font-semibold text-foreground">לסדר את חדר השינה</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground">תגמול</p>
            <p className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <Coins className="h-3 w-3 text-[color:var(--coin)]" aria-hidden />
              <span style={{ fontFeatureSettings: '"tnum"' }}>10</span>
            </p>
          </div>
          <m.div
            animate={active ? { scale: [1, 0.94, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: easeOutSoft }}
            className="self-end rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
          >
            שלח
          </m.div>
        </div>
      </div>
    </div>
  );
}

function ChildDoneIllustration({ active }: { active: boolean }) {
  return (
    <div className="rounded-lg bg-card p-3">
      <div className="rounded-md border border-border bg-background p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">לסדר את חדר השינה</p>
          <span
            className="relative inline-flex h-[1.125rem] min-w-[3.5rem] items-center justify-center"
            aria-hidden
          >
            <AnimatePresence initial={false}>
              {active ? (
                <m.span
                  key="sent"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.25, ease: easeOutSoft }}
                  className="absolute inset-0 flex items-center justify-center gap-0.5 rounded-full bg-success/15 px-2 text-[9px] font-medium text-success"
                >
                  <Check className="h-2.5 w-2.5" aria-hidden />
                  נשלח
                </m.span>
              ) : (
                <m.span
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-warning/15 px-2 text-[9px] font-medium text-[color:var(--warning-foreground)]"
                >
                  פעיל
                </m.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">תגמול: 10 מטבעות</p>
      </div>
      <m.div
        animate={active ? { scale: [1, 0.94, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: easeOutSoft }}
        className="mt-2 flex items-center justify-center rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground"
      >
        סיימתי!
      </m.div>
    </div>
  );
}

function SplitPayoutIllustration({ active }: { active: boolean }) {
  const wallet = useCountUp(9, { play: active, from: 0, durationMs: 700 });
  const savings = useCountUp(1, { play: active, from: 0, durationMs: 700 });

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-foreground/5 bg-card p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Coins className="h-3 w-3 text-[color:var(--coin)]" aria-hidden />
          ארנק
        </div>
        <p
          className="mt-1 text-lg font-bold text-foreground"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          +{wallet}
        </p>
      </div>
      <div className="rounded-lg border border-foreground/5 bg-card p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <PiggyBank className="h-3 w-3 text-primary" aria-hidden />
          חיסכון
        </div>
        <p
          className="mt-1 text-lg font-bold text-primary"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          +{savings}
        </p>
      </div>
      <m.div
        animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: easeOutSoft }}
        className="col-span-2 mt-1 flex items-center justify-center rounded-md bg-success/10 py-1.5 text-[10px] font-medium text-success"
      >
        <Check className="me-1 h-3 w-3" aria-hidden />
        פיצול 10% אוטומטי
      </m.div>
    </div>
  );
}
