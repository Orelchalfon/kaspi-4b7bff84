import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Sparkles } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { AnimatedNumber } from "@/components/animated-number";
import { StatusBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/child/dashboard")({
  component: ChildDashboard,
});

interface TaskRow {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  created_at: string | null;
}

function ChildDashboard() {
  const { childProfileId } = useAuth();
  const [balance, setBalance] = useState(0);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childProfileId) return;

    async function load() {
      const { data: txData } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("child_id", childProfileId!);
      const WALLET_TYPES = new Set(["task_reward", "manual_adjustment", "wallet_debit"]);
      setBalance(
        (txData || []).reduce(
          (sum: number, t: { amount: number; type: string }) =>
            WALLET_TYPES.has(t.type) ? sum + t.amount : sum,
          0,
        ),
      );

      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, title, reward_amount, status, created_at")
        .eq("child_id", childProfileId!)
        .order("created_at", { ascending: false });
      setTasks((taskData || []) as TaskRow[]);

      setLoading(false);
    }

    load();
  }, [childProfileId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground" aria-label={`היתרה שלי: ${balance} מטבעות`}>
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">היתרה שלי</p>
          <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
            <Coins className="h-8 w-8 text-coin" aria-hidden />
            <AnimatedNumber value={balance} />
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">המשימות שלי</h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-50" aria-hidden />
              <p>אין משימות עדיין. ההורים יוסיפו בקרוב!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link key={task.id} to="/child/tasks/$taskId" params={{ taskId: task.id }}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex min-h-16 items-center justify-between py-4">
                    <div>
                      <p className="text-base font-medium">{task.title}</p>
                      <div className="mt-1.5">
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                    <CoinAmount value={task.reward_amount} size="lg" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
