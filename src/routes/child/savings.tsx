import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PiggyBank, Target, Plus, CheckCircle2, Coins, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CoinAmount } from "@/components/coin-amount";
import { AnimatedNumber } from "@/components/animated-number";
import { TransactionRow } from "@/components/transaction-row";
import { ListSkeleton } from "@/components/loading-skeletons";
import { cn } from "@/lib/utils";
import {
  computeGoalDeposits,
  computeSavingsBalance,
  computeWalletBalance,
} from "@/lib/transactions";

export const Route = createFileRoute("/child/savings")({
  component: ChildSavings,
});

type CyclePeriod = "day" | "week" | "month";
type DepositSource = "wallet" | "savings";

interface GoalRow {
  id: string;
  title: string;
  target_amount: number;
  cycle_amount: number;
  cycle_period: CyclePeriod;
  status: "active" | "completed" | "cancelled";
}

interface TxRow {
  id: string;
  amount: number;
  type: string;
  goal_id: string | null;
  reference_task_id: string | null;
  created_at: string | null;
}

const periodLabel: Record<CyclePeriod, string> = {
  day: "יום",
  week: "שבוע",
  month: "חודש",
};

const goalSchema = z
  .object({
    title: z.string().trim().min(1, "כותרת חובה").max(60, "עד 60 תווים"),
    target_amount: z.coerce
      .number({ invalid_type_error: "חייב להיות מספר" })
      .int("חייב להיות מספר שלם")
      .positive("חייב להיות חיובי")
      .max(100000, "עד 100,000"),
    cycle_amount: z.coerce
      .number({ invalid_type_error: "חייב להיות מספר" })
      .int("חייב להיות מספר שלם")
      .positive("חייב להיות חיובי"),
    cycle_period: z.enum(["day", "week", "month"]),
  })
  .refine((d) => d.cycle_amount <= d.target_amount, {
    message: "סכום מחזורי לא יכול להיות גדול מהיעד",
    path: ["cycle_amount"],
  });

function ChildSavings() {
  const { childProfileId, householdId, user } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [goalTitles, setGoalTitles] = useState<Record<string, string>>({});
  const [savingsPct, setSavingsPct] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add-goal dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [cycleInput, setCycleInput] = useState("");
  const [periodInput, setPeriodInput] = useState<CyclePeriod>("week");
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof z.infer<typeof goalSchema>, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  // Move-to-savings dialog
  const [moveOpen, setMoveOpen] = useState(false);

  async function loadAll(cpId: string, hhId: string) {
    const [{ data: gData }, { data: tData }, { data: sData }] = await Promise.all([
      supabase
        .from("goals")
        .select("id, title, target_amount, cycle_amount, cycle_period, status")
        .eq("child_id", cpId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, amount, type, goal_id, reference_task_id, created_at")
        .eq("child_id", cpId)
        .order("created_at", { ascending: false }),
      supabase
        .from("household_settings")
        .select("savings_percentage")
        .eq("household_id", hhId)
        .maybeSingle(),
    ]);

    const goalList = (gData ?? []) as GoalRow[];
    const txList = (tData ?? []) as TxRow[];
    setGoals(goalList);
    setTransactions(txList);
    setSavingsPct(sData?.savings_percentage ?? 0);

    // Goal titles come straight from the goals we already fetched.
    const goalMap: Record<string, string> = {};
    goalList.forEach((g) => (goalMap[g.id] = g.title));
    setGoalTitles(goalMap);

    // Task titles only matter for savings_credit rows that came from approve_task_and_pay.
    const taskIds = Array.from(
      new Set(
        txList
          .filter((t) => t.type === "savings_credit" && t.reference_task_id)
          .map((t) => t.reference_task_id as string),
      ),
    );
    if (taskIds.length > 0) {
      const { data: titlesData } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);
      const map: Record<string, string> = {};
      (titlesData || []).forEach((t: { id: string; title: string }) => (map[t.id] = t.title));
      setTaskTitles(map);
    } else {
      setTaskTitles({});
    }
  }

  useEffect(() => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    loadAll(childProfileId, householdId).finally(() => setLoading(false));
  }, [childProfileId, householdId]);

  const savingsBalance = useMemo(() => computeSavingsBalance(transactions), [transactions]);
  const walletBalance = useMemo(() => computeWalletBalance(transactions), [transactions]);
  const depositedByGoal = useMemo(() => computeGoalDeposits(transactions), [transactions]);

  const recentSavings = useMemo(
    () => transactions.filter((t) => t.type === "savings_credit").slice(0, 5),
    [transactions],
  );

  function resetForm() {
    setTitleInput("");
    setTargetInput("");
    setCycleInput("");
    setPeriodInput("week");
    setFormErrors({});
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!childProfileId || !householdId || !user) return;

    const parsed = goalSchema.safeParse({
      title: titleInput,
      target_amount: targetInput,
      cycle_amount: cycleInput,
      cycle_period: periodInput,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? "";
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFormErrors(errs);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    const { error } = await supabase.from("goals").insert({
      household_id: householdId,
      child_id: childProfileId,
      title: parsed.data.title,
      target_amount: parsed.data.target_amount,
      cycle_amount: parsed.data.cycle_amount,
      cycle_period: parsed.data.cycle_period,
      created_by: user.id,
    });
    setSubmitting(false);

    if (error) {
      console.error("[create goal]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה ביצירת המטרה");
      return;
    }

    toast.success("המטרה נוצרה");
    setDialogOpen(false);
    resetForm();
    if (childProfileId && householdId) await loadAll(childProfileId, householdId);
  }

  async function refresh() {
    if (childProfileId && householdId) await loadAll(childProfileId, householdId);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-primary/10">
          <CardContent className="h-40" />
        </Card>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A. Savings pot card with wallet chip + move action */}
      <Card
        className="bg-primary text-primary-foreground shadow-md"
        aria-label={`חיסכון: ${savingsBalance} מטבעות`}
      >
        <CardContent className="space-y-4 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <PiggyBank className="h-4 w-4" aria-hidden />
              <span>החיסכון שלי</span>
            </div>
            <p className="flex items-center gap-2 text-4xl font-bold tabular-nums">
              <Coins className="h-8 w-8 text-coin" aria-hidden />
              <AnimatedNumber value={savingsBalance} />
            </p>
            <p className="text-xs opacity-80">
              {savingsPct > 0
                ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול`
                : "כרגע אין העברה אוטומטית מהתגמולים"}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs"
              aria-label={`יתרה בארנק ${walletBalance} מטבעות`}
            >
              <Coins className="h-3.5 w-3.5 text-coin" aria-hidden />
              <span>בארנק</span>
              <AnimatedNumber value={walletBalance} className="font-semibold" />
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setMoveOpen(true)}
              disabled={walletBalance <= 0}
              className="min-h-9 gap-1.5 transition-transform active:scale-[0.97]"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
              <span>העבר לחיסכון</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <MoveToSavingsDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        walletBalance={walletBalance}
        onSuccess={refresh}
      />

      {recentSavings.length > 0 && (
        <section aria-label="חיסכון אחרון">
          <h2 className="mb-3 text-base font-semibold">חיסכון אחרון</h2>
          <div className="space-y-2">
            {recentSavings.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                taskTitle={tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined}
                goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* B. Goals board */}
      <section aria-label="המטרות שלי">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">המטרות שלי</h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-10 transition-transform active:scale-[0.97]">
                <Plus className="h-4 w-4" aria-hidden />
                <span className="ms-1.5">הוסף מטרה</span>
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>מטרה חדשה</DialogTitle>
                <DialogDescription>הגדירו יעד חיסכון וסכום קבוע להפקדה.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="goal-title">שם המטרה</Label>
                  <Input
                    id="goal-title"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="אופניים חדשות"
                    maxLength={60}
                    autoFocus
                  />
                  {formErrors.title && (
                    <p role="alert" className="text-xs text-destructive">
                      {formErrors.title}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-target">יעד (מטבעות)</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100000}
                    dir="ltr"
                    className="tabular-nums"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="500"
                  />
                  {formErrors.target_amount && (
                    <p role="alert" className="text-xs text-destructive">
                      {formErrors.target_amount}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="goal-cycle">סכום מחזורי</Label>
                    <Input
                      id="goal-cycle"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      dir="ltr"
                      className="tabular-nums"
                      value={cycleInput}
                      onChange={(e) => setCycleInput(e.target.value)}
                      placeholder="20"
                    />
                    {formErrors.cycle_amount && (
                      <p role="alert" className="text-xs text-destructive">
                        {formErrors.cycle_amount}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-period">תדירות</Label>
                    <Select
                      value={periodInput}
                      onValueChange={(v) => setPeriodInput(v as CyclePeriod)}
                    >
                      <SelectTrigger id="goal-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">יום</SelectItem>
                        <SelectItem value="week">שבוע</SelectItem>
                        <SelectItem value="month">חודש</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="min-h-11 w-full">
                    {submitting ? "שומר..." : "צור מטרה"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Target className="h-10 w-10 opacity-40" aria-hidden />
              <p>עדיין אין מטרות. הוסיפו אחת!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                deposited={depositedByGoal[goal.id] ?? 0}
                walletBalance={walletBalance}
                savingsBalance={savingsBalance}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GoalCard({
  goal,
  deposited,
  walletBalance,
  savingsBalance,
  onChanged,
}: {
  goal: GoalRow;
  deposited: number;
  walletBalance: number;
  savingsBalance: number;
  onChanged: () => Promise<void>;
}) {
  const [source, setSource] = useState<DepositSource>("wallet");
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [acting, setActing] = useState(false);

  const remaining = Math.max(0, goal.target_amount - deposited);
  const isCompleted = goal.status === "completed";
  const pct = Math.min(100, Math.round((deposited / goal.target_amount) * 100));

  const sourceBalance = source === "wallet" ? walletBalance : savingsBalance;

  const customNum = Number(customInput);
  const customValid = customInput !== "" && Number.isInteger(customNum) && customNum > 0;
  const amount = useCustom ? (customValid ? customNum : 0) : goal.cycle_amount;
  const overSource = amount > sourceBalance;
  const overTarget = amount > remaining;
  const canDeposit = !isCompleted && amount > 0 && !overSource && !overTarget;

  async function deposit() {
    if (!canDeposit || acting) return;
    setActing(true);
    const rpc = source === "wallet" ? "deposit_to_goal" : "deposit_savings_to_goal";
    const { data, error } = await supabase.rpc(rpc, {
      _goal_id: goal.id,
      _amount: amount,
    });
    setActing(false);

    if (error) {
      console.error(`[${rpc}]`, error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בהפקדה");
      return;
    }
    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      toast.error(String((data as Record<string, unknown>).error));
      return;
    }
    toast.success("הפקדה הצליחה!");
    if (useCustom) {
      setUseCustom(false);
      setCustomInput("");
    }
    await onChanged();
  }

  const sourceWord = source === "wallet" ? "מהארנק" : "מהחיסכון";
  const ctaLabel = (() => {
    if (isCompleted) return "הושלם";
    if (acting) return "מפקיד...";
    if (useCustom && !customValid) return "הזינו סכום";
    if (overSource) return source === "wallet" ? "אין מספיק בארנק" : "אין מספיק בחיסכון";
    if (overTarget) return `נשאר רק ${remaining}`;
    return `הפקד ${amount} ${sourceWord}`;
  })();

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow",
        isCompleted ? "opacity-70" : "hover:shadow-md",
      )}
    >
      <CardContent className="space-y-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isCompleted && (
              <span
                className="inline-flex h-6 items-center gap-1 rounded-full bg-success/15 px-2 text-xs font-semibold text-success"
                aria-label="הושלם"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                הושלם
              </span>
            )}
            <p className="font-semibold">{goal.title}</p>
          </div>
          <CoinAmount value={goal.target_amount} />
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-primary/15"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% הושלמו`}
        >
          <div
            className="h-full w-full origin-right bg-primary transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            <AnimatedNumber value={deposited} className="font-semibold text-foreground" /> מתוך{" "}
            {goal.target_amount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
            {goal.cycle_amount} כל {periodLabel[goal.cycle_period]}
          </span>
        </div>

        {!isCompleted && (
          <>
            <div
              role="radiogroup"
              aria-label="מקור ההפקדה"
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            >
              <SourceOption
                active={source === "wallet"}
                disabled={acting}
                label="ארנק"
                balance={walletBalance}
                onClick={() => setSource("wallet")}
              />
              <SourceOption
                active={source === "savings"}
                disabled={acting}
                label="חיסכון"
                balance={savingsBalance}
                onClick={() => setSource("savings")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUseCustom(false)}
                disabled={acting}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium transition-colors",
                  !useCustom
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                סכום מחזורי {goal.cycle_amount}
              </button>
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                disabled={acting}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium transition-colors",
                  useCustom
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                סכום אחר
              </button>
            </div>

            {useCustom && (
              <div className="space-y-1">
                <Label htmlFor={`goal-custom-${goal.id}`} className="sr-only">
                  סכום מותאם
                </Label>
                <Input
                  id={`goal-custom-${goal.id}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={Math.max(1, Math.min(sourceBalance, remaining))}
                  dir="ltr"
                  className="tabular-nums"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={`עד ${Math.min(sourceBalance, remaining)}`}
                  disabled={acting}
                  autoFocus
                />
              </div>
            )}

            <Button
              className="min-h-11 w-full transition-transform active:scale-[0.98]"
              onClick={deposit}
              disabled={!canDeposit || acting}
              aria-label={ctaLabel}
            >
              {ctaLabel}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SourceOption({
  active,
  disabled,
  label,
  balance,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  balance: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1.5 text-sm transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-60",
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-[11px] tabular-nums opacity-70">
        זמין <AnimatedNumber value={balance} />
      </span>
    </button>
  );
}

function MoveToSavingsDialog({
  open,
  onOpenChange,
  walletBalance,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  onSuccess: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setErr(null);
      setSubmitting(false);
    }
  }, [open]);

  const num = Number(amount);
  const valid = amount !== "" && Number.isInteger(num) && num > 0 && num <= walletBalance;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      setErr(num > walletBalance ? `אין מספיק בארנק (${walletBalance})` : "סכום לא תקין");
      return;
    }
    setSubmitting(true);
    setErr(null);
    const { data, error } = await supabase.rpc("deposit_to_savings", { _amount: num });
    setSubmitting(false);

    if (error) {
      console.error("[deposit_to_savings]", error);
      setErr(import.meta.env.DEV ? error.message : "שגיאה בהעברה");
      return;
    }
    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      setErr(String((data as Record<string, unknown>).error));
      return;
    }
    toast.success("ההעברה הצליחה");
    onOpenChange(false);
    await onSuccess();
  }

  function setMax() {
    setAmount(String(walletBalance));
    setErr(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>העברה לחיסכון</DialogTitle>
          <DialogDescription>העבירו מטבעות מהארנק לחיסכון שלכם.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="move-amount">סכום</Label>
              <button
                type="button"
                onClick={setMax}
                className="text-xs font-medium text-primary hover:underline"
                disabled={submitting || walletBalance <= 0}
              >
                העבר הכל ({walletBalance})
              </button>
            </div>
            <Input
              id="move-amount"
              type="number"
              inputMode="numeric"
              min={1}
              max={walletBalance}
              dir="ltr"
              className="tabular-nums text-lg"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (err) setErr(null);
              }}
              placeholder="50"
              autoFocus
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              בארנק: <span className="tabular-nums font-semibold">{walletBalance}</span> מטבעות
            </p>
            {err && (
              <p role="alert" className="text-xs text-destructive">
                {err}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="min-h-11 w-full transition-transform active:scale-[0.98]"
              disabled={submitting || !valid}
            >
              {submitting ? "מעביר..." : "העבר"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
