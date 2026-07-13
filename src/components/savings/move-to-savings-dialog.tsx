import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";

export function MoveToSavingsDialog({
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
