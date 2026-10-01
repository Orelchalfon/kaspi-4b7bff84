import { Link } from "@tanstack/react-router";
import { ArrowLeft, Receipt } from "lucide-react";
import { TransactionRow } from "@/components/transaction-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TxRow } from "@/components/parent-dashboard/types";

/** The dashboard shows the latest N wallet transactions; the rest live on /parent/transactions. */
const RECENT_TX_LIMIT = 20;

interface ChildTransactionsProps {
  /** The selected child's wallet-affecting transactions, newest first. */
  childTransactions: TxRow[];
  taskTitles: Record<string, string>;
}

/** "תנועות": the latest RECENT_TX_LIMIT wallet rows, with a link to the full ledger. */
export function ChildTransactions({ childTransactions, taskTitles }: ChildTransactionsProps) {
  const txTaskTitle = (taskId: string | null) => (taskId ? taskTitles[taskId] : undefined);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">תנועות</h3>
        {childTransactions.length > RECENT_TX_LIMIT && (
          <Button asChild variant="link" className="h-11 px-2">
            <Link to="/parent/transactions">
              לכל התנועות
              <ArrowLeft aria-hidden />
            </Link>
          </Button>
        )}
      </div>
      {childTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Receipt className="size-8 opacity-50" aria-hidden />
            <p>אין תנועות עדיין.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {childTransactions.slice(0, RECENT_TX_LIMIT).map((tx) => (
            <li key={tx.id}>
              <TransactionRow tx={tx} taskTitle={txTaskTitle(tx.reference_task_id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
