import { AnimatedNumber } from "@/components/animated-number";
import { CoinAmount } from "@/components/coin-amount";
import { ListSkeleton } from "@/components/loading-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Pencil,
  PiggyBank,
  Receipt,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/wallet")({
  component: ChildWallet,
});

interface TxRow {
  id: string;
  amount: number;
  type: string;
  reference_task_id: string | null;
  goal_id: string | null;
  created_at: string | null;
}

const WALLET_TYPES = new Set(["task_reward", "manual_adjustment", "wallet_debit"]);

function describeTx(
  tx: TxRow,
  taskTitle: string | undefined,
  goalTitle: string | undefined,
): { Icon: LucideIcon; label: string } {
  switch (tx.type) {
    case "task_reward":
      return { Icon: CheckCircle2, label: taskTitle ?? "תגמול ממשימה" };
    case "manual_adjustment":
      return { Icon: Pencil, label: "התאמה ידנית" };
    case "wallet_debit":
      if (tx.goal_id) {
        return {
          Icon: Target,
          label: goalTitle ? `הפקדה: ${goalTitle}` : "הפקדה למטרה",
        };
      }
      if (tx.reference_task_id) {
        return {
          Icon: PiggyBank,
          label: taskTitle ? `חיסכון אוטומטי מ${taskTitle}` : "חיסכון אוטומטי",
        };
      }
      return { Icon: PiggyBank, label: "העברה לחיסכון" };
    default:
      return { Icon: Coins, label: "תנועה" };
  }
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
      const walletTxs = txs.filter((t) => WALLET_TYPES.has(t.type));
      setTransactions(walletTxs);
      setBalance(walletTxs.reduce((sum, t) => sum + t.amount, 0));

      const taskIds = Array.from(
        new Set(
          walletTxs
            .map((t) => t.reference_task_id)
            .filter((id): id is string => !!id),
        ),
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
            {transactions.map((tx) => {
              const positive = tx.amount > 0;
              const { Icon, label } = describeTx(
                tx,
                tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined,
                tx.goal_id ? goalTitles[tx.goal_id] : undefined,
              );
              return (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          positive
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive",
                        )}
                        aria-hidden
                      >
                        {positive ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleDateString("he-IL")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <CoinAmount
                      value={tx.amount}
                      signed
                      tone={positive ? "success" : "destructive"}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
