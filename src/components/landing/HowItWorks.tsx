import {
  AnimatePresence,
  m,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Check, Coins, PiggyBank } from "lucide-react";
import { useRef, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { easeOutSoft, fadeUp, fadeUpItem, staggerContainer, viewportOnce } from "./motion/variants";
import { useCountUp } from "./use-count-up";
import { useStepCycle } from "./use-step-cycle";

type Step = (typeof steps)[number];

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
  const isMobile = useIsMobile();
  const olRef = useRef<HTMLOListElement>(null);
  const inView = useInView(olRef, { amount: 0.4 });

  const loopRun = !reduceMotion && !isMobile && inView;
  const cycle = useStepCycle(steps.length, { run: loopRun });

  const loopActiveStep = reduceMotion || isMobile ? -1 : cycle;
  const progress = loopActiveStep <= 0 ? 0 : loopActiveStep / (steps.length - 1);

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
          {steps.map((step, i) => (
            <StepCard
              key={step.n}
              step={step}
              isMobile={isMobile}
              reduceMotion={reduceMotion}
              loopActive={loopActiveStep === i}
            />
          ))}
        </m.ol>
      </div>
    </section>
  );
}

// On mobile the highlight is fully reached ~60% through the scrub (so the card
// sits lit while centered); the one-shot micro-actions fire at this point.
const MICRO_THRESHOLD = 0.55;

function StepCard({
  step,
  isMobile,
  reduceMotion,
  loopActive,
}: {
  step: Step;
  isMobile: boolean;
  reduceMotion: boolean;
  loopActive: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);

  // Mobile: scroll-LINKED. scrollYProgress runs 0 when the card's top hits the
  // viewport vertical center → 1 when its bottom hits the center.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  // Continuous highlight intensity, eased to full by ~60% of the scrub.
  const scrollGlow = useTransform(scrollYProgress, [0, 0.6], [0, 1], { clamp: true });

  // Discrete micro-actions fire once when the scrub crosses the threshold; they
  // never play in reverse (the keyframe/count-up actions just re-fire forward
  // on a later pass). Desktop ignores this and uses the shared loop index.
  const [scrolledActive, setScrolledActive] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolledActive(v >= MICRO_THRESHOLD);
  });

  const active = reduceMotion ? false : isMobile ? scrolledActive : loopActive;

  return (
    <m.li
      ref={ref}
      variants={fadeUpItem}
      className="relative flex flex-col rounded-2xl border border-foreground/5 bg-card p-6"
    >
      {/* Highlight overlay (paint-only: primary ring + lift). Opacity is
          scrubbed by scroll on mobile, boolean-animated by the loop on desktop. */}
      {!reduceMotion && (
        <m.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-lg ring-1 ring-primary"
          style={isMobile ? { opacity: scrollGlow } : undefined}
          initial={false}
          animate={isMobile ? undefined : { opacity: loopActive ? 1 : 0 }}
          transition={isMobile ? undefined : { duration: 0.4, ease: easeOutSoft }}
        />
      )}
      <div className="relative flex items-center gap-3">
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
