import { m } from "framer-motion";
import { ArrowDownRight, Bike, BookOpen, Check, Coins, PiggyBank } from "lucide-react";

import { cardHoverLift, fadeUp, viewportOnce } from "./motion/variants";

export function FeatureRows() {
  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-24 px-5 md:gap-32 md:px-8">
        <FeatureRow
          id="savings"
          eyebrow="חיסכון"
          headline="חיסכון אוטומטי, בלי לחשוב על זה."
          body="קובעים אחוז פעם אחת בהגדרות המשפחה. כל אישור משימה מפצל את התגמול אוטומטית — חלק לארנק, חלק לקופת החיסכון. אין מה לזכור, אין מה להעביר ידנית."
          illustration={<SavingsIllustration />}
          reversed={false}
        />
        <FeatureRow
          id="goals"
          eyebrow="מטרות"
          headline="מטרה לכל ילד, בקצב שלו."
          body="יוצרים מטרה (אופניים? משחק?), בוחרים סכום מחזורי — יום, שבוע או חודש — והילד מפקיד מהארנק או מהחיסכון בקצב שלו. ההרגל נבנה דרך החזרה הקטנה."
          illustration={<GoalsIllustration />}
          reversed={true}
        />
        <FeatureRow
          id="educate"
          eyebrow="לימוד"
          headline="תגמול גם על לימוד, לא רק על מטלות."
          body="ההורה בוחר נושאים — אנגלית, חשבון, תורה, כספים — והילד עונה על חידון של 5 שאלות. עברת? המטבעות עוברים אוטומטית לארנק, עם אותו פיצול חיסכון. נושא אחד, פעם ביום."
          illustration={<EducateIllustration />}
          reversed={false}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  id,
  eyebrow,
  headline,
  body,
  illustration,
  reversed,
}: {
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  illustration: React.ReactNode;
  reversed: boolean;
}) {
  return (
    <m.div
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16"
    >
      <div className={reversed ? "md:order-2" : "md:order-1"}>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {headline}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
          {body}
        </p>
      </div>
      <m.div {...cardHoverLift} className={reversed ? "md:order-1" : "md:order-2"}>
        {illustration}
      </m.div>
    </m.div>
  );
}

function SavingsIllustration() {
  return (
    <div className="relative">
      <div className="relative isolate rounded-3xl border border-foreground/5 bg-card p-5 shadow-[0_1px_2px_rgba(20,30,60,0.04),0_18px_40px_-24px_rgba(20,30,60,0.15)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="h-5 w-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">החיסכון של נועם</p>
              <p className="text-[11px] text-muted-foreground">‎10% מועבר אוטומטית</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] text-muted-foreground">היתרה</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className="text-4xl font-bold tracking-tight text-foreground"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              34
            </span>
            <span className="text-sm font-medium text-muted-foreground">מטבעות</span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <SavingsRow date="היום" amount="+1" />
          <SavingsRow date="אתמול" amount="+2" />
          <SavingsRow date="לפני יומיים" amount="+1" />
        </div>
      </div>

      <Callout className="-top-3 end-4">
        <span className="text-base font-bold" style={{ fontFeatureSettings: '"tnum"' }}>
          10%
        </span>
        <span className="text-[10px] font-medium opacity-80">מכל משימה</span>
      </Callout>
    </div>
  );
}

function SavingsRow({ date, amount }: { date: string; amount: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-foreground/5 bg-background/60 px-3 py-2">
      <div className="flex items-center gap-2">
        <ArrowDownRight className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      <span
        className="text-sm font-semibold text-primary"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {amount}
      </span>
    </div>
  );
}

function GoalsIllustration() {
  return (
    <div className="relative">
      <div className="relative isolate rounded-3xl border border-foreground/5 bg-card p-5 shadow-[0_1px_2px_rgba(20,30,60,0.04),0_18px_40px_-24px_rgba(20,30,60,0.15)]">
        <GoalCard title="אופניים חדשים" deposited={120} target={200} cycle="‎20 נקודות כל שבוע" />
        <div className="mt-3">
          <GoalCard
            title="משחק חדש"
            deposited={45}
            target={60}
            cycle="‎5 נקודות כל יום"
            secondary
          />
        </div>
      </div>

      <Callout className="-top-3 start-4">
        <span className="text-base font-bold" style={{ fontFeatureSettings: '"tnum"' }}>
          20
        </span>
        <span className="text-[10px] font-medium opacity-80">כל שבוע</span>
      </Callout>
    </div>
  );
}

function GoalCard({
  title,
  deposited,
  target,
  cycle,
  secondary = false,
}: {
  title: string;
  deposited: number;
  target: number;
  cycle: string;
  secondary?: boolean;
}) {
  const pct = Math.min(100, Math.round((deposited / target) * 100));
  return (
    <div className="rounded-2xl border border-foreground/5 bg-background/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bike className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <span
          className="text-xs font-medium text-muted-foreground"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {deposited} / {target}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} aria-hidden />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{cycle}</p>
        {!secondary && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Coins className="h-3 w-3" aria-hidden />
            הפקד 20
          </span>
        )}
      </div>
    </div>
  );
}

function EducateIllustration() {
  return (
    <div className="relative">
      <div className="relative isolate rounded-3xl border border-foreground/5 bg-card p-5 shadow-[0_1px_2px_rgba(20,30,60,0.04),0_18px_40px_-24px_rgba(20,30,60,0.15)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">חידון בחשבון</p>
            <p className="text-[11px] text-muted-foreground">שאלה 3 מתוך 5</p>
          </div>
        </div>

        <p className="mt-5 text-base leading-snug font-semibold text-foreground">כמה זה ‎5 + 7?</p>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <QuizChoice label="11" />
          <QuizChoice label="12" selected />
          <QuizChoice label="13" />
          <QuizChoice label="14" />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-foreground/5 bg-background/60 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-success" aria-hidden />
            עברת — נצבר אוטומטית
          </span>
          <span
            className="text-sm font-semibold text-primary"
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            +5
          </span>
        </div>
      </div>

      <Callout className="-top-3 end-4">
        <span className="text-base font-bold" style={{ fontFeatureSettings: '"tnum"' }}>
          +5
        </span>
        <span className="text-[10px] font-medium opacity-80">לכל נושא ביום</span>
      </Callout>
    </div>
  );
}

function QuizChoice({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <div
      className={
        selected
          ? "rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
          : "rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-foreground"
      }
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {label}
    </div>
  );
}

function Callout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute z-10 flex flex-col items-center rounded-2xl border border-primary/15 bg-[color:var(--ks-cyan-soft)] px-3.5 py-2 text-[color:var(--ks-navy-deep)] shadow-[0_8px_24px_-12px_rgba(20,30,60,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}
