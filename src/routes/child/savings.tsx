import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { PiggyBank, Target, Plus, CheckCircle2, ArrowDownLeft } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { DashboardSkeleton } from "@/components/loading-skeletons";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/child/savings")({
  component: ChildSavings,
});

const WALLET_TYPES = ["reward_credit", "manual_adjustment", "wallet_debit", "goal_credit"] as const;

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  cycle_amount: number;
  cycle_period: string;
  status: string;
}

interface Tx {
  id: string;
  amount: number;
  type: string;
  goal_id: string | null;
  created_at: string;
}

const goalSchema = z.object({
  title: z.string().trim().min(1, "שם נדרש").max(60, "מקסימום 60 תווים"),
  target_amount: z.number().int().positive("חייב להיות חיובי").max(100000),
  cycle_amount: z.number().int().positive("חייב להיות חיובי"),
  cycle_period: z.enum(["day", "week", "month"]),
});

const cyclePeriodLabel: Record<string, string> = {
  day: "יום",
  week: "שבוע",
  month: "חודש",
};

function ChildSavings() {
  const { childProfileId, householdId } = useAuth();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [savingsPct, setSavingsPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [cycle, setCycle] = useState("");
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!childProfileId || !householdId) return;
    const [{ data: txData }, { data: goalData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, type, goal_id, created_at")
        .eq("child_profile_id", childProfileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("child_profile_id", childProfileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("household_settings")
        .select("savings_percentage")
        .eq("household_id", householdId)
        .maybeSingle(),
    ]);
    setTransactions((txData || []) as Tx[]);
    setGoals((goalData || []) as Goal[]);
    setSavingsPct(settingsData?.savings_percentage ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childProfileId, householdId]);

  const savingsBalance = useMemo(
    () => transactions.filter((t) => t.type === "savings_credit").reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const walletBalance = useMemo(
    () => transactions.filter((t) => (WALLET_TYPES as readonly string[]).includes(t.type)).reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const savingsTransactions = useMemo(
    () => transactions.filter((t) => t.type === "savings_credit").slice(0, 10),
    [transactions],
  );

  const depositedByGoal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type === "goal_credit" && t.goal_id) m[t.goal_id] = (m[t.goal_id] ?? 0) + t.amount;
    }
    return m;
  }, [transactions]);

  function resetForm() {
    setTitle("");
    setTarget("");
    setCycle("");
    setPeriod("week");
    setErrors({});
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!childProfileId || !householdId) return;

    const parsed = goalSchema.safeParse({
      title,
      target_amount: Number(target),
      cycle_amount: Number(cycle),
      cycle_period: period,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (parsed.data.cycle_amount > parsed.data.target_amount) {
      setErrors({ cycle_amount: "סכום ההפקדה לא יכול להיות גדול מהמטרה" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("goals").insert({
      household_id: householdId,
      child_profile_id: childProfileId,
      title: parsed.data.title,
      target_amount: parsed.data.target_amount,
      cycle_amount: parsed.data.cycle_amount,
      cycle_period: parsed.data.cycle_period,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? "",
    });
    setSubmitting(false);

    if (error) {
      toast.error("שגיאה ביצירת המטרה");
      return;
    }
    toast.success("המטרה נוספה!");
    setDialogOpen(false);
    resetForm();
    await load();
  }

  async function handleDeposit(goal: Goal) {
    setDepositing(goal.id);
    const { data, error } = await supabase.rpc("deposit_to_goal", {
      _goal_id: goal.id,
      _amount: goal.cycle_amount,
    });
    setDepositing(null);
    if (error) {
      toast.error("שגיאה בהפקדה");
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error === "Insufficient wallet balance" ? "אין מספיק יתרה בארנק" : (data as any).error);
      return;
    }
    toast.success("הפקדה הצליחה!");
    await load();
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Savings pot */}
      <Card className="bg-primary text-primary-foreground" aria-label={`חיסכון: ${savingsBalance} מטבעות`}>
        <CardContent className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 opacity-90">
            <PiggyBank className="h-5 w-5" aria-hidden />
            <p className="text-sm">החיסכון שלי</p>
          </div>
          <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
            <CoinAmount value={savingsBalance} size="xl" tone="primary" />
          </p>
          <p className="mt-2 text-xs opacity-80">
            {savingsPct > 0
              ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול`
              : "ההורים עדיין לא הגדירו אחוז חיסכון"}
          </p>
        </CardContent>
      </Card>

      {/* Recent savings transactions */}
      {savingsTransactions.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">תנועות חיסכון אחרונות</h2>
          <div className="space-y-2">
            {savingsTransactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
                      <ArrowDownLeft className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <CoinAmount value={tx.amount} signed tone="success" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Goals board */}
      <section>
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
                <DialogDescription>הגדירו שם, יעד וסכום הפקדה תקופתי.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="g-title">שם המטרה</Label>
                  <Input
                    id="g-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={60}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-target">מחיר המטרה (מטבעות)</Label>
                  <Input
                    id="g-target"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    aria-invalid={!!errors.target_amount}
                  />
                  {errors.target_amount && <p className="text-xs text-destructive">{errors.target_amount}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="g-cycle">כמה להפקיד</Label>
                    <Input
                      id="g-cycle"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={cycle}
                      onChange={(e) => setCycle(e.target.value)}
                      aria-invalid={!!errors.cycle_amount}
                    />
                    {errors.cycle_amount && <p className="text-xs text-destructive">{errors.cycle_amount}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="g-period">כל כמה זמן</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                      <SelectTrigger id="g-period">
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
                  <Button type="submit" disabled={submitting} className="min-h-10">
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
            {goals.map((g) => {
              const deposited = depositedByGoal[g.id] ?? 0;
              const pct = Math.min(100, Math.round((deposited / g.target_amount) * 100));
              const completed = g.status === "completed" || deposited >= g.target_amount;
              const canDeposit =
                !completed && walletBalance >= g.cycle_amount && deposited + g.cycle_amount <= g.target_amount;
              return (
                <Card key={g.id} className={completed ? "opacity-80" : ""}>
                  <CardContent className="space-y-3 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.cycle_amount} מטבעות כל {cyclePeriodLabel[g.cycle_period]}
                        </p>
                      </div>
                      {completed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          הושלם
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Progress value={pct} aria-label={`${pct}% מהמטרה`} />
                      <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                        <span>
                          {deposited} מתוך {g.target_amount}
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full min-h-10"
                      disabled={!canDeposit || depositing === g.id}
                      onClick={() => handleDeposit(g)}
                    >
                      {completed
                        ? "הושלם"
                        : depositing === g.id
                        ? "מפקיד..."
                        : `הפקד ${g.cycle_amount} מטבעות`}
                    </Button>
                    {!completed && walletBalance < g.cycle_amount && (
                      <p className="text-center text-xs text-muted-foreground">אין מספיק יתרה בארנק</p>
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
