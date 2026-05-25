import { type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CoinAmount } from "@/components/coin-amount";
import { describeTx, type DescribeTxInput } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export interface TransactionRowTx extends DescribeTxInput {
  id: string;
  amount: number;
  created_at: string | null;
}

interface TransactionRowProps {
  tx: TransactionRowTx;
  taskTitle?: string;
  goalTitle?: string;
  /** Overrides the default direction circle (e.g. a ChildAvatar in parent views). */
  leading?: ReactNode;
  /** Overrides the describeTx label (e.g. child name in parent views). */
  primaryLabel?: ReactNode;
  /** Hide the small context icon between leading and label. Defaults to true. */
  showContextIcon?: boolean;
  className?: string;
}

function DirectionIndicator({ positive }: { positive: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
    </span>
  );
}

export function TransactionRow({
  tx,
  taskTitle,
  goalTitle,
  leading,
  primaryLabel,
  showContextIcon = true,
  className,
}: TransactionRowProps) {
  const positive = tx.amount > 0;
  const { Icon, label } = describeTx(tx, taskTitle, goalTitle);
  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {leading ?? <DirectionIndicator positive={positive} />}
          {showContextIcon && (
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{primaryLabel ?? label}</p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {tx.created_at ? new Date(tx.created_at).toLocaleDateString("he-IL") : "—"}
            </p>
          </div>
        </div>
        <CoinAmount value={tx.amount} signed tone={positive ? "success" : "destructive"} />
      </CardContent>
    </Card>
  );
}
