import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavingsPercentCardProps {
  householdId: string;
  /** Saved value from the last load. The page re-keys this card on every reload, so the
   *  input resets to the saved value exactly as before the split. */
  initialPct: number;
}

/** "אחוז חיסכון אוטומטי" card: edits household_settings.savings_percentage. */
export function SavingsPercentCard({ householdId, initialPct }: SavingsPercentCardProps) {
  const [savingsPct, setSavingsPct] = useState<number>(initialPct);
  const [pctInput, setPctInput] = useState<string>(String(initialPct));
  const [savingPct, setSavingPct] = useState(false);
  const [pctError, setPctError] = useState("");

  const handleSavePct = async () => {
    const n = Number(pctInput);
    if (!Number.isFinite(n) || n < 0 || n > 100 || !Number.isInteger(n)) {
      setPctError("אחוז חייב להיות מספר שלם בין 0 ל-100");
      return;
    }
    setPctError("");
    setSavingPct(true);
    const { error } = await supabase
      .from("household_settings")
      .upsert({ household_id: householdId, savings_percentage: n }, { onConflict: "household_id" });
    setSavingPct(false);
    if (error) {
      console.error("[savings_percentage]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בשמירה");
      return;
    }
    toast.success("אחוז החיסכון עודכן");
    setSavingsPct(n);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PiggyBank className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold">אחוז חיסכון אוטומטי</h2>
            <p className="text-xs text-muted-foreground">
              כל אישור משימה יעביר אחוז זה מהתגמול לחיסכון של הילד
              {savingsPct > 0 ? ` (כרגע ${savingsPct}%)` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="pct" className="text-xs">
                אחוז (0-100)
              </Label>
              <Input
                id="pct"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={pctInput}
                onChange={(e) => {
                  setPctInput(e.target.value);
                  setPctError("");
                }}
                aria-invalid={!!pctError || undefined}
                aria-describedby={pctError ? "pct-error" : undefined}
                className="h-11 w-24 tabular-nums"
              />
            </div>
            <Button
              size="touch"
              onClick={handleSavePct}
              disabled={savingPct || pctInput === String(savingsPct)}
            >
              {savingPct && <Loader2 className="animate-spin" aria-hidden />}
              {savingPct ? "שומר..." : "שמור"}
            </Button>
          </div>
          {pctError && (
            <p id="pct-error" role="alert" className="text-xs text-destructive">
              {pctError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
