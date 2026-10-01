import { BalanceHero } from "@/components/balance-hero";
import { TransactionRow, type TransactionRowTx } from "@/components/transaction-row";
import { BalanceHeroSkeleton, ListSkeleton } from "@/components/loading-skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Receipt, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { computeWalletBalance, isWalletTx } from "@/lib/transactions";

export const Route = createFileRoute("/child/wallet")({
  component: ChildWallet,
});

const PAGE_SIZE = 30;

interface TxRow extends TransactionRowTx {
  type: string;
}

function ChildWallet() {
  const { childProfileId } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [goalTitles, setGoalTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // Every row is already loaded (the balance needs them all), so "load more" only
  // reveals more of them — no extra request.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    if (!childProfileId) return;
    setLoading(true);
    setLoadFailed(false);
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("id, amount, type, reference_task_id, goal_id, created_at")
      .eq("child_id", childProfileId!)
      .order("created_at", { ascending: false });
    if (txError) {
      console.error("[child/wallet] load failed", txError);
      setLoadFailed(true);
      setLoading(false);
      return;
    }

    const txs = (txData || []) as TxRow[];
    const walletTxs = txs.filter((t) => isWalletTx(t.type));
    setTransactions(walletTxs);
    setBalance(computeWalletBalance(walletTxs));

    const taskIds = Array.from(
      new Set(walletTxs.map((t) => t.reference_task_id).filter((id): id is string => !!id)),
    );
    const goalIds = Array.from(
      new Set(walletTxs.map((t) => t.goal_id).filter((id): id is string => !!id)),
    );

    const [taskRes, goalRes] = await Promise.all([
      taskIds.length
        ? supabase.from("tasks").select("id, title").in("id", taskIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      goalIds.length
        ? supabase.from("goals").select("id, title").in("id", goalIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

    const taskMap: Record<string, string> = {};
    (taskRes.data || []).forEach((t) => (taskMap[t.id] = t.title));
    setTaskTitles(taskMap);

    const goalMap: Record<string, string> = {};
    (goalRes.data || []).forEach((g) => (goalMap[g.id] = g.title));
    setGoalTitles(goalMap);

    setLoading(false);
  }, [childProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">הארנק שלי</h1>
        <BalanceHeroSkeleton />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">הארנק שלי</h1>
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את הארנק. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={() => void load()}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">הארנק שלי</h1>
      <BalanceHero value={balance} />

      <section aria-labelledby="wallet-history-heading">
        <h2 id="wallet-history-heading" className="mb-3 text-lg font-semibold">
          היסטוריית תנועות
        </h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-40" aria-hidden />
              <p>אין תנועות עדיין. השלימו משימות כדי לצבור מטבעות!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <StaggerList className="flex flex-col gap-2">
              {transactions.slice(0, visibleCount).map((tx, i) => (
                <StaggerItem key={tx.id} index={i % PAGE_SIZE}>
                  <TransactionRow
                    tx={tx}
                    taskTitle={tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined}
                    goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
            {transactions.length > visibleCount && (
              <Button
                size="touch"
                variant="outline"
                className="self-center"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                <ChevronDown aria-hidden />
                טען עוד
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
