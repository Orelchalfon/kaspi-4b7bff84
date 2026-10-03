import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Pencil, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoinAmount } from "@/components/coin-amount";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";
import {
  periodLabel,
  sourceFromLabel,
  type DepositSource,
  type GoalRow,
} from "@/components/savings/types";
import { SourcePicker } from "@/components/savings/source-picker";
import { EditGoalDialog } from "@/components/savings/edit-goal-dialog";

export function GoalCard({
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
  const [source, setSource] = useState<DepositSource>(goal.auto_source);
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [acting, setActing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

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
            {!isCompleted && (
              <Button
                variant="ghost"
                size="icon-touch"
                className="-my-2 text-muted-foreground hover:text-foreground"
                onClick={() => setEditOpen(true)}
                disabled={acting}
                aria-label={`עריכת המטרה ${goal.title}`}
              >
                <Pencil aria-hidden />
              </Button>
            )}
          </div>
          <CoinAmount value={goal.target_amount} />
        </div>

        {!isCompleted && (
          <EditGoalDialog
            goal={goal}
            deposited={deposited}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSaved={onChanged}
          />
        )}

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
          {!goal.auto_deposit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {goal.cycle_amount} כל {periodLabel[goal.cycle_period]}
            </span>
          )}
        </div>

        {goal.auto_deposit && !isCompleted && <AutoDepositChip goal={goal} />}

        {!isCompleted && (
          <section aria-label="הפקדה למטרה" className="space-y-4 border-t pt-4">
            <SourcePicker
              value={source}
              onChange={setSource}
              walletBalance={walletBalance}
              savingsBalance={savingsBalance}
              needed={amount}
              disabled={acting}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">כמה להפקיד?</p>
              <ToggleGroup
                type="single"
                value={useCustom ? "custom" : "cycle"}
                onValueChange={(v) => {
                  if (v === "cycle" || v === "custom") setUseCustom(v === "custom");
                }}
                disabled={acting}
                aria-label="כמה להפקיד?"
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
          </section>
        )}
      </CardContent>
    </Card>
  );
}

const amountChipClass =
  "min-h-11 rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:size-4";

function AutoDepositChip({ goal }: { goal: GoalRow }) {
  const waiting = goal.last_auto_status === "insufficient";
  const next = goal.next_auto_deposit_on
    ? nextDateFormat.format(new Date(`${goal.next_auto_deposit_on}T12:00:00`))
    : null;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg px-3 py-2 text-xs",
        waiting ? "bg-warning/20 text-warning-foreground" : "bg-primary/10 text-foreground",
      )}
    >
      <Repeat className="size-3.5 shrink-0" aria-hidden />
      <span className="font-semibold">אוטומטי:</span>
      <span>
        {goal.cycle_amount} כל {periodLabel[goal.cycle_period]} {sourceFromLabel[goal.auto_source]}
      </span>
      {waiting ? (
        <span className="font-medium">· ממתין ליתרה — ננסה שוב מחר</span>
      ) : (
        next && <span className="text-muted-foreground">· הבא ב־{next}</span>
      )}
    </p>
  );
}

const nextDateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });
