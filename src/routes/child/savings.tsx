import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PiggyBank, Target, Plus, CheckCircle2, Coins } from "lucide-react";
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
import { ListSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/child/savings")({
  component: ChildSavings,
});

type CyclePeriod = "day" | "week" | "month";

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
  const [savingsPct, setSavingsPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [cycleInput, setCycleInput] = useState("");
  const [periodInput, setPeriodInput] = useState<CyclePeriod>("week");
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof z.infer<typeof goalSchema>, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  async function loadAll(cpId: string, hhId: string) {
    const [{ data: gData }, { data: tData }, { data: sData }] = await Promise.all([
      supabase
        .from("goals")
        .select("id, title, target_amount, cycle_amount, cycle_period, status")
        .eq("child_id", cpId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, amount, type, goal_id, created_at")
        .eq("child_id", cpId)
        .order("created_at", { ascending: false }),
      supabase
        .from("household_settings")
        .select("savings_percentage")
        .eq("household_id", hhId)
        .maybeSingle(),
    ]);

    setGoals((gData ?? []) as GoalRow[]);
    setTransactions((tData ?? []) as TxRow[]);
    setSavingsPct(sData?.savings_percentage ?? 0);
  }

  useEffect(() => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    loadAll(childProfileId, householdId).finally(() => setLoading(false));
  }, [childProfileId, householdId]);

  const savingsBalance = useMemo(
    () => transactions.filter((t) => t.type === "savings_credit").reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const walletBalance = useMemo(
    () =>
      transactions
        .filter(
          (t) =>
            t.type === "reward_credit" ||
            t.type === "manual_adjustment" ||
            t.type === "wallet_debit",
        )
        .reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const depositedByGoal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "goal_credit" && t.goal_id) {
        m[t.goal_id] = (m[t.goal_id] ?? 0) + t.amount;
      }
    }
    return m;
  }, [transactions]);

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

  async function handleDeposit(goal: GoalRow) {
    if (walletBalance < goal.cycle_amount) {
      toast.error("אין מספיק יתרה בארנק");
      return;
    }
    setActing(goal.id);
    const { data, error } = await supabase.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: goal.cycle_amount,
    });
    setActing(null);

    if (error) {
      console.error("[deposit_to_goal]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בהפקדה");
      return;
    }
    if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
      toast.error(String((data as Record<string, unknown>).error));
      return;
    }
    toast.success("הפקדה הצליחה!");
    if (childProfileId && householdId) await loadAll(childProfileId, householdId);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-primary/10">
          <CardContent className="h-28" />
        </Card>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A. Savings pot card */}
      <Card
        className="bg-primary text-primary-foreground"
        aria-label={`חיסכון: ${savingsBalance} מטבעות`}
      >
        <CardContent className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm opacity-80">
            <PiggyBank className="h-4 w-4" aria-hidden />
            <span>החיסכון שלי</span>
          </div>
          <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
            <Coins className="h-8 w-8 text-coin" aria-hidden />
            <span>{savingsBalance}</span>
          </p>
          <p className="mt-2 text-xs opacity-80">
            {savingsPct > 0
              ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול`
              : "כרגע אין העברה אוטומטית מהתגמולים"}
          </p>
        </CardContent>
      </Card>

      {recentSavings.length > 0 && (
        <section aria-label="חיסכון אחרון">
          <h2 className="mb-3 text-base font-semibold">חיסכון אחרון</h2>
          <div className="space-y-2">
            {recentSavings.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString("he-IL") : "—"}
                  </p>
                  <CoinAmount value={tx.amount} signed tone="success" />
                </CardContent>
              </Card>
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
              <Button size="sm" className="min-h-10">
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
            {goals.map((goal) => {
              const deposited = depositedByGoal[goal.id] ?? 0;
              const pct = Math.min(100, Math.round((deposited / goal.target_amount) * 100));
              const isCompleted = goal.status === "completed";
              const insufficient = walletBalance < goal.cycle_amount;
              return (
                <Card key={goal.id} className={isCompleted ? "opacity-70" : ""}>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                      <span>
                        {deposited} מתוך {goal.target_amount}
                      </span>
                      <span>
                        {goal.cycle_amount} נקודות כל {periodLabel[goal.cycle_period]}
                      </span>
                    </div>

                    {!isCompleted && (
                      <Button
                        className="min-h-10 w-full"
                        onClick={() => handleDeposit(goal)}
                        disabled={acting === goal.id || insufficient}
                        aria-label={`הפקד ${goal.cycle_amount} מטבעות ל${goal.title}`}
                      >
                        {acting === goal.id
                          ? "מפקיד..."
                          : insufficient
                            ? "אין מספיק יתרה"
                            : `הפקד עכשיו (${goal.cycle_amount})`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
