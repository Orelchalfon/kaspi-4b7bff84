import { CheckCircle2, PiggyBank, Wallet, type LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CoinAmount } from "@/components/coin-amount";
import { cn } from "@/lib/utils";
import type { DepositSource } from "@/components/savings/types";

interface SourcePickerProps {
  value: DepositSource;
  onChange: (source: DepositSource) => void;
  /** Visible label above the tiles; also the group's accessible name. */
  label?: string;
  /** When given, each tile shows "זמין X" and flags a source that can't cover `needed`. */
  walletBalance?: number;
  savingsBalance?: number;
  needed?: number;
  disabled?: boolean;
}

const OPTIONS: { value: DepositSource; name: string; icon: LucideIcon }[] = [
  { value: "wallet", name: "ארנק", icon: Wallet },
  { value: "savings", name: "חיסכון", icon: PiggyBank },
];

/** Big wallet/savings tiles. Radix ToggleGroup: radio semantics + arrow-key roving focus. */
export function SourcePicker({
  value,
  onChange,
  label = "מאיפה להפקיד?",
  walletBalance,
  savingsBalance,
  needed,
  disabled,
}: SourcePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v === "wallet" || v === "savings") onChange(v);
        }}
        disabled={disabled}
        aria-label={label}
        className="grid grid-cols-2 gap-2"
      >
        {OPTIONS.map(({ value: option, name, icon: Icon }) => {
          const balance = option === "wallet" ? walletBalance : savingsBalance;
          const selected = value === option;
          const short = balance !== undefined && needed !== undefined && needed > balance;
          return (
            <ToggleGroupItem
              key={option}
              value={option}
              className={cn(
                "relative flex h-auto min-h-16 flex-col items-start justify-center gap-1 rounded-xl border bg-card px-3 py-2.5 text-start text-foreground shadow-none transition-colors",
                "hover:border-primary/50 hover:bg-primary/5 hover:text-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground",
              )}
            >
              {selected && (
                <CheckCircle2 className="absolute end-2 top-2 size-5 text-primary" aria-hidden />
              )}
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className={cn("text-base", selected ? "font-bold" : "font-medium")}>
                  {name}
                </span>
              </span>
              {balance !== undefined && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  זמין
                  <CoinAmount value={balance} size="sm" />
                </span>
              )}
              {short && <span className="text-xs font-medium text-destructive">לא מספיק</span>}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
