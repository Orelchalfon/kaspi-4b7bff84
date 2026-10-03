import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CyclePeriod, DepositSource, GoalRow } from "@/components/savings/types";
import { AutoDepositFields } from "@/components/savings/auto-deposit-fields";
import {
  goalEditSchema,
  zodIssuesToErrors,
  type GoalFormErrors,
} from "@/components/savings/goal-schema";

interface EditGoalDialogProps {
  goal: GoalRow;
  /** Sum of `goal_credit` already in this goal — the lowest allowed target. */
  deposited: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful update (the page refetches). */
  onSaved: () => Promise<void>;
}

/** "עריכת מטרה" dialog for an active goal. Target can't drop below what's deposited. */
export function EditGoalDialog({
  goal,
  deposited,
  open,
  onOpenChange,
  onSaved,
}: EditGoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>עריכת מטרה</DialogTitle>
          <DialogDescription>אפשר לשנות את השם, היעד והסכום המחזורי.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the form re-initialises from `goal` every time. */}
        <EditGoalForm
          goal={goal}
          deposited={deposited}
          onDone={async () => {
            onOpenChange(false);
            await onSaved();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditGoalForm({
  goal,
  deposited,
  onDone,
}: {
  goal: GoalRow;
  deposited: number;
  onDone: () => Promise<void>;
}) {
  const [titleInput, setTitleInput] = useState(goal.title);
  const [targetInput, setTargetInput] = useState(String(goal.target_amount));
  const [cycleInput, setCycleInput] = useState(String(goal.cycle_amount));
  const [periodInput, setPeriodInput] = useState<CyclePeriod>(goal.cycle_period);
  const [autoInput, setAutoInput] = useState(goal.auto_deposit);
  const [autoSourceInput, setAutoSourceInput] = useState<DepositSource>(goal.auto_source);
  const [formErrors, setFormErrors] = useState<GoalFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsed = goalEditSchema(deposited).safeParse({
      title: titleInput,
      target_amount: targetInput,
      cycle_amount: cycleInput,
      cycle_period: periodInput,
      auto_deposit: autoInput,
      auto_source: autoSourceInput,
    });
    if (!parsed.success) {
      setFormErrors(zodIssuesToErrors(parsed.error.issues));
      return;
    }

    setFormErrors({});
    setSubmitError("");
    setSubmitting(true);
    const completes = parsed.data.target_amount === deposited;
    const { data, error } = await supabase
      .from("goals")
      .update({
        title: parsed.data.title,
        target_amount: parsed.data.target_amount,
        cycle_amount: parsed.data.cycle_amount,
        cycle_period: parsed.data.cycle_period,
        // The DB trigger owns next_auto_deposit_on (resets on enable / period change).
        auto_deposit: parsed.data.auto_deposit,
        auto_source: parsed.data.auto_source,
        ...(completes ? { status: "completed" } : {}),
      })
      .eq("id", goal.id)
      // Don't overwrite a goal a concurrent deposit just completed.
      .eq("status", "active")
      .select("id");
    setSubmitting(false);

    if (error) {
      console.error("[edit goal]", error);
      setSubmitError(
        import.meta.env.DEV ? `שגיאה: ${error.message}` : "השמירה לא הצליחה. נסו שוב.",
      );
      return;
    }
    if (!data || data.length === 0) {
      setSubmitError("המטרה השתנתה — רעננו ונסו שוב");
      return;
    }

    toast.success(completes ? "המטרה הושלמה!" : "המטרה עודכנה");
    await onDone();
  }

  const idPrefix = `edit-goal-${goal.id}`;

  return (
    <form onSubmit={handleSave} className="space-y-4" noValidate>
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>שם המטרה</Label>
        <Input
          id={`${idPrefix}-title`}
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          maxLength={60}
          className="h-11"
          disabled={submitting}
          aria-invalid={!!formErrors.title || undefined}
          aria-describedby={formErrors.title ? `${idPrefix}-title-error` : undefined}
        />
        {formErrors.title && (
          <p id={`${idPrefix}-title-error`} role="alert" className="text-xs text-destructive">
            {formErrors.title}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-target`}>יעד (מטבעות)</Label>
        <Input
          id={`${idPrefix}-target`}
          type="number"
          inputMode="numeric"
          min={Math.max(1, deposited)}
          max={100000}
          dir="ltr"
          className="h-11 tabular-nums"
          disabled={submitting}
          aria-invalid={!!formErrors.target_amount || undefined}
          aria-describedby={
            formErrors.target_amount
              ? `${idPrefix}-target-error`
              : deposited > 0
                ? `${idPrefix}-target-hint`
                : undefined
          }
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
        />
        {formErrors.target_amount ? (
          <p id={`${idPrefix}-target-error`} role="alert" className="text-xs text-destructive">
            {formErrors.target_amount}
          </p>
        ) : (
          deposited > 0 && (
            <p id={`${idPrefix}-target-hint`} className="text-xs text-muted-foreground">
              כבר הופקדו {deposited} — זה היעד המינימלי
            </p>
          )
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cycle`}>סכום מחזורי</Label>
          <Input
            id={`${idPrefix}-cycle`}
            type="number"
            inputMode="numeric"
            min={1}
            dir="ltr"
            className="h-11 tabular-nums"
            disabled={submitting}
            aria-invalid={!!formErrors.cycle_amount || undefined}
            aria-describedby={formErrors.cycle_amount ? `${idPrefix}-cycle-error` : undefined}
            value={cycleInput}
            onChange={(e) => setCycleInput(e.target.value)}
          />
          {formErrors.cycle_amount && (
            <p id={`${idPrefix}-cycle-error`} role="alert" className="text-xs text-destructive">
              {formErrors.cycle_amount}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-period`}>תדירות</Label>
          <Select
            value={periodInput}
            onValueChange={(v) => setPeriodInput(v as CyclePeriod)}
            disabled={submitting}
          >
            <SelectTrigger id={`${idPrefix}-period`} className="h-11">
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

      <AutoDepositFields
        idPrefix={idPrefix}
        enabled={autoInput}
        onEnabledChange={setAutoInput}
        source={autoSourceInput}
        onSourceChange={setAutoSourceInput}
        cycleAmount={cycleInput}
        period={periodInput}
        disabled={submitting}
        resetsSchedule={!goal.auto_deposit || periodInput !== goal.cycle_period}
      />

      <DialogFooter>
        <Button type="submit" size="touch" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "שומר..." : "שמור שינויים"}
        </Button>
      </DialogFooter>
    </form>
  );
}
