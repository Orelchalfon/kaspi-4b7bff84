import { m } from "framer-motion";
import { Check, Coins, PiggyBank } from "lucide-react";

import { cn } from "@/lib/utils";
import { fadeUp, viewportOnce } from "./motion/variants";

const steps = [
  {
    n: 1,
    title: "הורה מגדיר משימה",
    body: 'לדוגמה: "לסדר את חדר השינה — 10 מטבעות". פותחים, ממלאים, שולחים.',
    illustration: <ParentTaskIllustration />,
  },
  {
    n: 2,
    title: 'ילד מסמן "סיימתי!"',
    body: "ההורה רואה את הבקשה ולוחץ אישור או דחייה — בלי לעבור בין מסכים.",
    illustration: <ChildDoneIllustration />,
  },
  {
    n: 3,
    title: "התגמול מתחלק אוטומטית",
    body: "אחוז שהגדרת עובר ישר לקופת החיסכון. השאר נכנס לארנק.",
    illustration: <SplitPayoutIllustration />,
  },
];

export function HowItWorks() {
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
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="relative mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 md:gap-6"
        >
          <DesktopConnector />
          {steps.map((step) => (
            <li
              key={step.n}
              className="relative flex flex-col rounded-2xl border border-foreground/5 bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--ks-navy-deep)] text-base font-bold text-background",
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
                {step.illustration}
              </div>
            </li>
          ))}
        </m.ol>
      </div>
    </section>
  );
}

function DesktopConnector() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute start-[12%] end-[12%] top-[4.5rem] hidden h-1 -translate-y-1/2 md:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 1"
    >
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
    </svg>
  );
}

function ParentTaskIllustration() {
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
          <div className="self-end rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">
            שלח
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildDoneIllustration() {
  return (
    <div className="rounded-lg bg-card p-3">
      <div className="rounded-md border border-border bg-background p-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">לסדר את חדר השינה</p>
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[9px] font-medium text-[color:var(--warning-foreground)]">
            פעיל
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">תגמול: 10 מטבעות</p>
      </div>
      <div className="mt-2 flex items-center justify-center rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground">
        סיימתי!
      </div>
    </div>
  );
}

function SplitPayoutIllustration() {
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
          +9
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
          +1
        </p>
      </div>
      <div className="col-span-2 mt-1 flex items-center justify-center rounded-md bg-success/10 py-1.5 text-[10px] font-medium text-success">
        <Check className="me-1 h-3 w-3" aria-hidden />
        פיצול 10% אוטומטי
      </div>
    </div>
  );
}
