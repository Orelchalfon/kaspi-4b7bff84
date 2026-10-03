import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SourcePicker } from "@/components/savings/source-picker";
import {
  periodLabel,
  sourceFromLabel,
  type CyclePeriod,
  type DepositSource,
} from "@/components/savings/types";

interface AutoDepositFieldsProps {
  idPrefix: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  source: DepositSource;
  onSourceChange: (source: DepositSource) => void;
  /** Raw cycle-amount input, for the helper sentence. */
  cycleAmount: string;
  period: CyclePeriod;
  disabled?: boolean;
  /** False when editing a goal whose schedule won't reset (already on, same period). */
  resetsSchedule?: boolean;
}

/** "הפקדה אוטומטית" switch + source tiles, shared by the add/edit goal dialogs. */
export function AutoDepositFields({
  idPrefix,
  enabled,
  onEnabledChange,
  source,
  onSourceChange,
  cycleAmount,
  period,
  disabled,
  resetsSchedule = true,
}: AutoDepositFieldsProps) {
  const amountText = cycleAmount.trim() || "הסכום המחזורי";
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor={`${idPrefix}-auto`} className="flex flex-col items-start gap-0.5">
          <span>הפקדה אוטומטית</span>
          <span className="text-xs font-normal text-muted-foreground">
            בלי ללחוץ — הכסף נכנס למטרה לבד
          </span>
        </Label>
        <Switch
          id={`${idPrefix}-auto`}
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>
      {enabled && (
        <>
          <SourcePicker
            value={source}
            onChange={onSourceChange}
            label="מאיפה לקחת?"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            {amountText} יופקדו אוטומטית כל {periodLabel[period]} {sourceFromLabel[source]}.
            {resetsSchedule && ` ההפקדה הראשונה בעוד ${periodLabel[period]}.`} אם לא יהיה מספיק —
            ננסה שוב כל יום.
          </p>
        </>
      )}
    </div>
  );
}
