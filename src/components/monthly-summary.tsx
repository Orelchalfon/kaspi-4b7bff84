import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  PiggyBank,
  RotateCw,
  Target,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * "This month" summary for the household ledger.
 *
 * Form (per the dataviz method): three headline numbers → a KPI row of stat tiles;
 * one part-to-whole → a single stacked bar of *earnings by source*. Earnings are a sum
 * of non-negative parts, so the bar always adds up (a "where did it go" bar would not:
 * a child spending last month's balance makes the wallet delta negative).
 *
 * It runs its own month-scoped query, so it is exact regardless of how many ledger
 * rows the page has paged in. Colors are the validated categorical tokens
 * --viz-tasks / --viz-quizzes / --viz-gifts (fixed order, never cycled); all text
 * uses text tokens, identity is carried by the swatch beside it.
 */

interface MonthTx {
  amount: number;
  type: string;
}

interface Totals {
  tasks: number;
  quizzes: number;
  gifts: number;
  saved: number;
  goals: number;
}

const SOURCES: {
  key: "tasks" | "quizzes" | "gifts";
  label: string;
  swatch: string;
  icon: LucideIcon;
}[] = [
  { key: "tasks", label: "משימות", swatch: "bg-viz-tasks", icon: CheckCircle2 },
  { key: "quizzes", label: "חידונים", swatch: "bg-viz-quizzes", icon: BookOpen },
  { key: "gifts", label: "מתנות מההורים", swatch: "bg-viz-gifts", icon: Gift },
];

/** [start, end) of the month `offset` months before the current one, in local time. */
function monthRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
  return { start, end };
}

function summarize(rows: MonthTx[]): Totals {
  const t: Totals = { tasks: 0, quizzes: 0, gifts: 0, saved: 0, goals: 0 };
  for (const r of rows) {
    const a = Number(r.amount);
    if (r.type === "task_reward") t.tasks += a;
    else if (r.type === "quiz_reward") t.quizzes += a;
    else if (r.type === "manual_adjustment" && a > 0) t.gifts += a;
    // Inflows only: savings_credit is negative when savings move on to a goal.
    else if (r.type === "savings_credit" && a > 0) t.saved += a;
    else if (r.type === "goal_credit") t.goals += a;
  }
  return t;
}

const fmt = (n: number) => n.toLocaleString("he-IL");

interface MonthlySummaryProps {
  householdId: string;
  /** Limit to one child; null = whole household. */
  childId: string | null;
}

export function MonthlySummary({ householdId, childId }: MonthlySummaryProps) {
  // 0 = current month, 1 = last month, … (never negative: no future months).
  const [monthOffset, setMonthOffset] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { start } = monthRange(monthOffset);

  useEffect(() => {
    let cancelled = false;
    const range = monthRange(monthOffset);
    setTotals(null);
    setFailed(false);
    let query = supabase
      .from("transactions")
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString())
      .in("type", [
        "task_reward",
        "quiz_reward",
        "manual_adjustment",
        "savings_credit",
        "goal_credit",
      ]);
    if (childId) query = query.eq("child_id", childId);
    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("[monthly-summary]", error);
        setFailed(true);
        return;
      }
      setTotals(summarize((data ?? []) as MonthTx[]));
    });
    return () => {
      cancelled = true;
    };
  }, [householdId, childId, monthOffset, attempt]);

  const isCurrentMonth = monthOffset === 0;
  const monthLabel = start.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  const label = (offset: number) =>
    monthRange(offset).start.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  const earned = totals ? totals.tasks + totals.quizzes + totals.gifts : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground" aria-live="polite">
            סיכום {monthLabel}
          </h2>
          {/* RTL: "previous" (back in time) points right, "next" points left. */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              onClick={() => setMonthOffset((o) => o + 1)}
              aria-label={`לחודש הקודם (${label(monthOffset + 1)})`}
            >
              <ChevronRight aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={isCurrentMonth}
              aria-label={
                isCurrentMonth ? "לחודש הבא (אין עדיין)" : `לחודש הבא (${label(monthOffset - 1)})`
              }
            >
              <ChevronLeft aria-hidden />
            </Button>
          </div>
        </div>

        {failed ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span role="alert">לא הצלחנו לטעון את הסיכום לחודש הזה.</span>
            <Button
              type="button"
              variant="link"
              className="h-11 px-1"
              onClick={() => setAttempt((a) => a + 1)}
            >
              <RotateCw aria-hidden />
              נסו שוב
            </Button>
          </div>
        ) : (
          <>
            {/* KPI row */}
            <dl className="grid grid-cols-3 gap-3">
              <StatTile
                label="הרוויחו"
                value={totals?.tasks !== undefined ? earned : null}
                icon={Coins}
              />
              <StatTile label="נכנס לחיסכון" value={totals?.saved ?? null} icon={PiggyBank} />
              <StatTile label="הופקד למטרות" value={totals?.goals ?? null} icon={Target} />
            </dl>

            {/* Earnings by source: one stacked bar + legend */}
            {totals === null ? (
              <Skeleton className="h-3 w-full rounded-full" />
            ) : earned === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isCurrentMonth ? "עדיין אין הכנסות החודש." : "לא היו הכנסות בחודש הזה."}
              </p>
            ) : (
              <EarningsBar totals={totals} earned={earned} monthLabel={monthLabel} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/50 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-xl font-semibold text-foreground">
        {value === null ? <Skeleton className="h-7 w-12" /> : fmt(value)}
      </dd>
    </div>
  );
}

function EarningsBar({
  totals,
  earned,
  monthLabel,
}: {
  totals: Totals;
  earned: number;
  monthLabel: string;
}) {
  const parts = SOURCES.map((s) => ({ ...s, value: totals[s.key] })).filter((p) => p.value > 0);
  const pct = (v: number) => Math.round((v / earned) * 100);
  const summary = parts.map((p) => `${p.label} ${fmt(p.value)} (${pct(p.value)}%)`).join(", ");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">מאיפה הגיעו המטבעות</p>
      <TooltipProvider delayDuration={100}>
        {/* RTL: the first source sits at the inline start (right). 2px surface gap between segments. */}
        <div
          role="img"
          aria-label={`מקורות ההכנסה ב${monthLabel}: ${summary}`}
          className="flex h-3 w-full gap-0.5"
        >
          {parts.map((p, i) => (
            <Tooltip key={p.key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-full min-w-1",
                    p.swatch,
                    i === 0 && "rounded-s-full",
                    i === parts.length - 1 && "rounded-e-full",
                  )}
                  style={{ flexGrow: p.value, flexBasis: 0 }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {p.label}: {fmt(p.value)} מטבעות ({pct(p.value)}%)
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Legend: always present (identity never by color alone), values in text tokens. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 shrink-0 rounded-sm", p.swatch)} />
            <span>{p.label}</span>
            <span className="font-medium tabular-nums text-foreground">{fmt(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
