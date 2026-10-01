import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Coins, Loader2 } from "lucide-react";
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
