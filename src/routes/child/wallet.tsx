import { AnimatedNumber } from "@/components/animated-number";
import { TransactionRow, type TransactionRowTx } from "@/components/transaction-row";
import { ListSkeleton } from "@/components/loading-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { Coins, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { computeWalletBalance, isWalletTx } from "@/lib/transactions";

export const Route = createFileRoute("/child/wallet")({
  component: ChildWallet,
});

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

  useEffect(() => {
    if (!childProfileId) return;

    async function load() {
      const { data: txData } = await supabase
        .from("transactions")
        .select("id, amount, type, reference_task_id, goal_id, created_at")
        .eq("child_id", childProfileId!)
        .order("created_at", { ascending: false });

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
    }

    load();
  }, [childProfileId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-primary/10">
          <CardContent className="h-24" />
        </Card>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        className="bg-primary text-primary-foreground"
        aria-label={`היתרה שלי: ${balance} מטבעות`}
      >
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">היתרה שלי</p>
          <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
            <Coins className="h-8 w-8 text-coin" aria-hidden />
            <AnimatedNumber value={balance} />
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">היסטוריית תנועות</h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-40" aria-hidden />
              <p>אין תנועות עדיין. השלימו משימות כדי לצבור מטבעות!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                taskTitle={tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined}
                goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
