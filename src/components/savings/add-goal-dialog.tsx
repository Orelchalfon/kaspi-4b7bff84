import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
import type { CyclePeriod, DepositSource } from "@/components/savings/types";
import { AutoDepositFields } from "@/components/savings/auto-deposit-fields";
import {
  goalSchema,
  zodIssuesToErrors,
  type GoalFormErrors,
} from "@/components/savings/goal-schema";

interface AddGoalDialogProps {
  /** Controlled so the page's empty state can open it too. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful insert (the page reloads its data). */
  onCreated: () => Promise<void>;
}

/** "הוסף מטרה" trigger + dialog: owns the form state, zod validation and the insert. */
export function AddGoalDialog({ open, onOpenChange, onCreated }: AddGoalDialogProps) {
  const { childProfileId, householdId, user } = useAuth();
  const [titleInput, setTitleInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [cycleInput, setCycleInput] = useState("");
  const [periodInput, setPeriodInput] = useState<CyclePeriod>("week");
  const [autoInput, setAutoInput] = useState(false);
  const [autoSourceInput, setAutoSourceInput] = useState<DepositSource>("wallet");
  const [formErrors, setFormErrors] = useState<GoalFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitleInput("");
    setTargetInput("");
    setCycleInput("");
    setPeriodInput("week");
    setAutoInput(false);
    setAutoSourceInput("wallet");
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
      auto_deposit: autoInput,
      auto_source: autoSourceInput,
    });
    if (!parsed.success) {
      setFormErrors(zodIssuesToErrors(parsed.error.issues));
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
      auto_deposit: parsed.data.auto_deposit,
      auto_source: parsed.data.auto_source,
      created_by: user.id,
    });
    setSubmitting(false);

    if (error) {
      console.error("[create goal]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה ביצירת המטרה");
      return;
    }

    toast.success("המטרה נוצרה");
    onOpenChange(false);
    resetForm();
    await onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="touch" className="transition-transform active:scale-[0.97]">
          <Plus aria-hidden />
          הוסף מטרה
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
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
              <Select value={periodInput} onValueChange={(v) => setPeriodInput(v as CyclePeriod)}>
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

          <AutoDepositFields
            idPrefix="goal"
            enabled={autoInput}
            onEnabledChange={setAutoInput}
            source={autoSourceInput}
            onSourceChange={setAutoSourceInput}
            cycleAmount={cycleInput}
            period={periodInput}
            disabled={submitting}
          />

          <DialogFooter>
            <Button type="submit" size="touch" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "שומר..." : "צור מטרה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
