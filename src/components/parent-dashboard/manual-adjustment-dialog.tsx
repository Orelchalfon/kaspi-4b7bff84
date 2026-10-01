import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ManualAdjustmentDialog({
  child,
  open,
  onOpenChange,
  onSaved,
}: {
  child: { id: string; display_name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amountInput, setAmountInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDirection("add");
      setAmountInput("");
      setError("");
      setConfirmOpen(false);
    }
  }, [open]);

  const parsedAmount = (): number | null => {
    const n = Number(amountInput);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
  };

  const performAdjustment = async (n: number) => {
    if (!child) return;
    setSubmitting(true);
    const signedAmount = direction === "add" ? n : -n;
    const { data, error: rpcError } = await supabase.rpc("manual_adjustment", {
      _child_id: child.id,
      _amount: signedAmount,
    });
    setSubmitting(false);

    const payload = data as { success?: boolean; error?: string } | null;
    if (rpcError || payload?.error) {
      console.error("[manual_adjustment]", rpcError ?? payload?.error);
      setError(
        payload?.error === "Adjustment would make wallet negative"
          ? "הפעולה תגרום ליתרה שלילית. בחרו סכום קטן יותר."
          : "לא ניתן לבצע את הפעולה. נסו שוב.",
      );
      return;
    }

    toast.success("היתרה עודכנה");
    onOpenChange(false);
    await onSaved();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!child || submitting) return;
    const n = parsedAmount();
    if (n === null) {
      setError("סכום חייב להיות מספר שלם חיובי");
      return;
    }
    setError("");
    // Taking coins away from a child is the destructive direction: confirm first.
    if (direction === "subtract") {
      setConfirmOpen(true);
      return;
    }
    await performAdjustment(n);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עדכון יתרה — {child?.display_name}</DialogTitle>
          <DialogDescription>הוסיפו או הפחיתו מטבעות מהארנק של הילד באופן ידני.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ToggleGroup
            type="single"
            value={direction}
            onValueChange={(v) => {
              // Radix emits "" when the active item is clicked again; keep a selection.
              if (v === "add" || v === "subtract") setDirection(v);
            }}
            variant="outline"
            aria-label="סוג העדכון"
            className="grid grid-cols-2"
          >
            <ToggleGroupItem
              value="add"
              className="h-11 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              <Plus aria-hidden />
              הוסף
            </ToggleGroupItem>
            <ToggleGroupItem
              value="subtract"
              className="h-11 data-[state=on]:border-destructive data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
            >
              <Minus aria-hidden />
              הפחת
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-amount">סכום</Label>
            <Input
              id="adjust-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setError("");
              }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "adjust-error" : undefined}
              className="h-11 tabular-nums"
              dir="ltr"
              autoFocus
            />
          </div>
          {error && (
            <Alert variant="destructive" id="adjust-error" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="submit"
              size="touch"
              variant={direction === "subtract" ? "destructive" : "default"}
              className="w-full"
              disabled={submitting}
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "מעדכן..." : direction === "subtract" ? "הפחתת מטבעות" : "הוספת מטבעות"}
            </Button>
          </DialogFooter>
        </form>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                להפחית {parsedAmount() ?? 0} מטבעות מ{child?.display_name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                המטבעות יירדו מהארנק של הילד ויופיעו אצלו כהתאמה ידנית.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const n = parsedAmount();
                  if (n !== null) void performAdjustment(n);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                הפחת
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
