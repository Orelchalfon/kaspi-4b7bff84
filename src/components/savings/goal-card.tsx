import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoinAmount } from "@/components/coin-amount";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";
import { SourceOption } from "@/components/savings/source-option";
import { periodLabel, type DepositSource, type GoalRow } from "@/components/savings/types";

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
