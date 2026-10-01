import { BalanceHero } from "@/components/balance-hero";
import { CoinAmount } from "@/components/coin-amount";
import { ChildDashboardSkeleton } from "@/components/loading-skeletons";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { computeWalletBalance } from "@/lib/transactions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!childProfileId) return;
    setLoading(true);
    setLoadFailed(false);
    const [txRes, taskRes] = await Promise.all([
      supabase.from("transactions").select("amount, type").eq("child_id", childProfileId),
      supabase
        .from("tasks")
        .select("id, title, reward_amount, status, created_at")
        .eq("child_id", childProfileId)
        .order("created_at", { ascending: false }),
    ]);
    if (txRes.error || taskRes.error) {
      console.error("[child/dashboard] load failed", txRes.error ?? taskRes.error);
      setLoadFailed(true);
    } else {
      setBalance(computeWalletBalance(txRes.data || []));
      setTasks((taskRes.data || []) as TaskRow[]);
    }
    setLoading(false);
  }, [childProfileId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <ChildDashboardSkeleton />;
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">ראשי</h1>
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את המסך. בדקו את האינטרנט ונסו שוב.
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
      <h1 className="sr-only">ראשי</h1>
      <BalanceHero value={balance} />

      <section aria-labelledby="my-tasks-heading" className="flex flex-col gap-3">
        <h2 id="my-tasks-heading" className="text-lg font-semibold">
          המשימות שלי
        </h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Sparkles className="size-8 opacity-50" aria-hidden />
              <p>אין משימות עדיין. ההורים יוסיפו בקרוב!</p>
            </CardContent>
          </Card>
        ) : (
          <StaggerList className="flex flex-col gap-3">
            {tasks.map((task, i) => (
              <StaggerItem key={task.id} index={i}>
                <Link
                  to="/child/tasks/$taskId"
                  params={{ taskId: task.id }}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardContent className="flex min-h-16 items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="text-base font-medium">{task.title}</p>
                        <div className="mt-1.5">
                          <StatusBadge status={task.status} />
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        <CoinAmount value={task.reward_amount} size="lg" />
                        {/* Forward in RTL points left. */}
                        <ChevronLeft className="size-5 text-muted-foreground" aria-hidden />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>
    </div>
  );
}
