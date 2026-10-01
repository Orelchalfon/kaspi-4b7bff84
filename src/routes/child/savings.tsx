import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCircle2,
  Coins,
  Loader2,
  PiggyBank,
  Plus,
  RotateCw,
  Target,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
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
import { BalanceHeroSkeleton, ListSkeleton } from "@/components/loading-skeletons";
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
  const [loadFailed, setLoadFailed] = useState(false);

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
    const [gRes, tRes, sRes] = await Promise.all([
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
    if (gRes.error || tRes.error || sRes.error) {
      console.error("[child/savings] load failed", gRes.error ?? tRes.error ?? sRes.error);
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);

    const goalList = (gRes.data ?? []) as GoalRow[];
    const txList = (tRes.data ?? []) as TxRow[];
    setGoals(goalList);
    setTransactions(txList);
    setSavingsPct(sRes.data?.savings_percentage ?? 0);

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

  const reload = () => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    loadAll(childProfileId, householdId).finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is recreated each render
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
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">חיסכון</h1>
        <BalanceHeroSkeleton tall />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">חיסכון</h1>
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את החיסכון. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={reload}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">חיסכון</h1>
      {/* A. Savings pot card with wallet chip + move action */}
      <Card className="bg-primary text-primary-foreground shadow-md">
        <CardContent className="space-y-4 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <PiggyBank className="h-4 w-4" aria-hidden />
              <span>החיסכון שלי</span>
            </div>
            <p className="flex items-center gap-2 text-4xl font-bold tabular-nums">
              <Coins className="size-8 text-coin" aria-hidden />
              <span aria-hidden>
                <AnimatedNumber value={savingsBalance} />
              </span>
              <span className="sr-only">{`${savingsBalance} מטבעות`}</span>
            </p>
            <p className="text-xs opacity-80">
              {savingsPct > 0
                ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול`
                : "כרגע אין העברה אוטומטית מהתגמולים"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 text-sm">
              <Coins className="size-4 text-coin" aria-hidden />
              <span>בארנק</span>
              <span aria-hidden>
                <AnimatedNumber value={walletBalance} className="font-semibold" />
              </span>
              <span className="sr-only">{`${walletBalance} מטבעות`}</span>
            </span>
            <Button
              size="touch"
              variant="secondary"
              onClick={() => setMoveOpen(true)}
              disabled={walletBalance <= 0}
              className="transition-transform active:scale-[0.97]"
            >
              <ArrowLeftRight aria-hidden />
              העבר לחיסכון
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
        <section aria-labelledby="recent-savings-heading">
          <h2 id="recent-savings-heading" className="mb-3 text-lg font-semibold">
            חיסכון אחרון
          </h2>
          <StaggerList className="flex flex-col gap-2">
            {recentSavings.map((tx, i) => (
              <StaggerItem key={tx.id} index={i}>
                <TransactionRow
                  tx={tx}
                  taskTitle={tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined}
                  goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      {/* B. Goals board */}
      <section aria-labelledby="goals-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="goals-heading" className="text-lg font-semibold">
            המטרות שלי
          </h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="touch" className="transition-transform active:scale-[0.97]">
                <Plus aria-hidden />
                הוסף מטרה
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
                    className="h-11"
                    aria-invalid={!!formErrors.title || undefined}
                    aria-describedby={formErrors.title ? "goal-title-error" : undefined}
                  />
                  {formErrors.title && (
                    <p id="goal-title-error" role="alert" className="text-xs text-destructive">
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
                    className="h-11 tabular-nums"
                    aria-invalid={!!formErrors.target_amount || undefined}
                    aria-describedby={formErrors.target_amount ? "goal-target-error" : undefined}
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="500"
                  />
                  {formErrors.target_amount && (
                    <p id="goal-target-error" role="alert" className="text-xs text-destructive">
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
                      className="h-11 tabular-nums"
                      aria-invalid={!!formErrors.cycle_amount || undefined}
                      aria-describedby={formErrors.cycle_amount ? "goal-cycle-error" : undefined}
                      value={cycleInput}
                      onChange={(e) => setCycleInput(e.target.value)}
                      placeholder="20"
                    />
                    {formErrors.cycle_amount && (
                      <p id="goal-cycle-error" role="alert" className="text-xs text-destructive">
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
                      <SelectTrigger id="goal-period" className="h-11">
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
                  <Button type="submit" size="touch" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="animate-spin" aria-hidden />}
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
              <Target className="size-10 opacity-40" aria-hidden />
              <p>עדיין אין מטרות. על מה תרצו לחסוך?</p>
              <Button
                size="touch"
                variant="outline"
                className="mt-1"
                onClick={() => setDialogOpen(true)}
              >
                <Plus aria-hidden />
                הוסיפו מטרה ראשונה
              </Button>
            </CardContent>
          </Card>
        ) : (
          <StaggerList className="grid gap-3 sm:grid-cols-2">
            {goals.map((goal, i) => (
              <StaggerItem key={goal.id} index={i}>
                <GoalCard
                  goal={goal}
                  deposited={depositedByGoal[goal.id] ?? 0}
                  walletBalance={walletBalance}
                  savingsBalance={savingsBalance}
                  onChanged={refresh}
                />
              </StaggerItem>
            ))}
          </StaggerList>
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depositError, setDepositError] = useState("");

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
    setDepositError("");
    const rpc = source === "wallet" ? "deposit_to_goal" : "deposit_savings_to_goal";
    const { data, error } = await supabase.rpc(rpc, {
      _goal_id: goal.id,
      _amount: amount,
    });
    setActing(false);

    if (error) {
      console.error(`[${rpc}]`, error);
      setDepositError(
        import.meta.env.DEV ? `שגיאה: ${error.message}` : "ההפקדה לא הצליחה. נסו שוב.",
      );
      return;
    }
    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      console.error(`[${rpc}]`, (data as Record<string, unknown>).error);
      setDepositError("ההפקדה לא הצליחה. ייתכן שהיתרה השתנתה — רעננו ונסו שוב.");
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
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success/15 px-2 text-xs font-semibold text-success">
                <CheckCircle2 className="size-3.5" aria-hidden />
                הושלם
              </span>
            )}
            <h3 className="font-semibold">{goal.title}</h3>
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
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            {goal.cycle_amount} כל {periodLabel[goal.cycle_period]}
          </span>
        </div>

        {!isCompleted && (
          <>
            {/* Radix ToggleGroup: real radio semantics + arrow-key roving focus. */}
            <ToggleGroup
              type="single"
              value={source}
              onValueChange={(v) => {
                if (v === "wallet" || v === "savings") setSource(v);
              }}
              disabled={acting}
              aria-label="מקור ההפקדה"
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            >
              <SourceOption value="wallet" label="ארנק" balance={walletBalance} />
              <SourceOption value="savings" label="חיסכון" balance={savingsBalance} />
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={useCustom ? "custom" : "cycle"}
              onValueChange={(v) => {
                if (v === "cycle" || v === "custom") setUseCustom(v === "custom");
              }}
              disabled={acting}
              aria-label="סכום ההפקדה"
              className="flex flex-wrap justify-start gap-2"
            >
              <ToggleGroupItem value="cycle" className={amountChipClass}>
                {!useCustom && <CheckCircle2 aria-hidden />}
                סכום מחזורי {goal.cycle_amount}
              </ToggleGroupItem>
              <ToggleGroupItem value="custom" className={amountChipClass}>
                {useCustom && <CheckCircle2 aria-hidden />}
                סכום אחר
              </ToggleGroupItem>
            </ToggleGroup>

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
                  className="h-11 tabular-nums"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={`עד ${Math.min(sourceBalance, remaining)}`}
                  disabled={acting}
                  autoFocus
                />
              </div>
            )}

            <Button
              size="touch"
              className="w-full transition-transform active:scale-[0.98]"
              onClick={() => setConfirmOpen(true)}
              disabled={!canDeposit || acting}
            >
              {acting && <Loader2 className="animate-spin" aria-hidden />}
              {ctaLabel}
            </Button>
            {depositError && (
              <p role="alert" className="text-xs text-destructive">
                {depositError}
              </p>
            )}

            {/* Money moves are confirmed before they happen. */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    להפקיד {amount} מטבעות למטרה &quot;{goal.title}&quot;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    המטבעות יעברו {sourceWord} למטרה. אחרי ההפקדה יישארו לך {sourceBalance - amount}{" "}
                    מטבעות ב{source === "wallet" ? "ארנק" : "חיסכון"}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void deposit()}>כן, להפקיד</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const amountChipClass =
  "min-h-11 rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:size-4";

function SourceOption({
  value,
  label,
  balance,
}: {
  value: DepositSource;
  label: string;
  balance: number;
}) {
  return (
    <ToggleGroupItem
      value={value}
      className="flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs tabular-nums opacity-70">זמין {balance}</span>
    </ToggleGroupItem>
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
  // Two steps: enter an amount, then confirm the move before any coins change pots.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setErr(null);
      setSubmitting(false);
      setConfirming(false);
    }
  }, [open]);

  const num = Number(amount);
  const valid = amount !== "" && Number.isInteger(num) && num > 0 && num <= walletBalance;

  function review(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      setErr(num > walletBalance ? `אין מספיק בארנק (${walletBalance})` : "סכום לא תקין");
      return;
    }
    setErr(null);
    setConfirming(true);
  }

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setErr(null);
    const { data, error } = await supabase.rpc("deposit_to_savings", { _amount: num });
    setSubmitting(false);

    if (error) {
      console.error("[deposit_to_savings]", error);
      setErr(import.meta.env.DEV ? error.message : "ההעברה לא הצליחה. נסו שוב.");
      setConfirming(false);
      return;
    }
    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      console.error("[deposit_to_savings]", (data as Record<string, unknown>).error);
      setErr("ההעברה לא הצליחה. ייתכן שהיתרה השתנתה — נסו שוב.");
      setConfirming(false);
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
        {confirming ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">להעביר מהארנק לחיסכון</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-3xl font-bold tabular-nums">
                <Coins className="size-7 text-coin" aria-hidden />
                {num}
                <span className="sr-only"> מטבעות</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                אחרי ההעברה יישארו בארנק{" "}
                <span className="font-semibold tabular-nums">{walletBalance - num}</span> מטבעות
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                size="touch"
                className="w-full"
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting && <Loader2 className="animate-spin" aria-hidden />}
                {submitting ? "מעביר..." : "כן, להעביר"}
              </Button>
              <Button
                size="touch"
                variant="ghost"
                className="w-full"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                שינוי הסכום
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={review} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="move-amount">סכום</Label>
                <Button
                  type="button"
                  variant="link"
                  onClick={setMax}
                  className="h-11 px-2"
                  disabled={submitting || walletBalance <= 0}
                >
                  העבר הכל ({walletBalance})
                </Button>
              </div>
              <Input
                id="move-amount"
                type="number"
                inputMode="numeric"
                min={1}
                max={walletBalance}
                dir="ltr"
                className="h-11 text-lg tabular-nums"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (err) setErr(null);
                }}
                placeholder="50"
                autoFocus
                aria-invalid={!!err || undefined}
                aria-describedby={err ? "move-hint move-error" : "move-hint"}
              />
              <p id="move-hint" className="text-xs text-muted-foreground">
                בארנק: <span className="font-semibold tabular-nums">{walletBalance}</span> מטבעות
              </p>
              {err && (
                <p id="move-error" role="alert" className="text-xs text-destructive">
                  {err}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" size="touch" className="w-full" disabled={!valid}>
                המשך
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
