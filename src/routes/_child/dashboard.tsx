import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_child/dashboard")({
  component: ChildDashboard,
});

function ChildDashboard() {
  const { childProfileId } = useAuth();
  const [balance, setBalance] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childProfileId) return;

    async function load() {
      // Balance from ledger
      const { data: txData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("child_profile_id", childProfileId!);
      setBalance((txData || []).reduce((sum, t) => sum + t.amount, 0));

      // My tasks
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*")
        .eq("child_profile_id", childProfileId!)
        .order("created_at", { ascending: false });
      setTasks(taskData || []);

      setLoading(false);
    }

    load();
  }, [childProfileId]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  const statusLabels: Record<string, string> = {
    assigned: "ממתינה",
    submitted: "הוגשה",
    approved: "אושרה ✅",
    rejected: "נדחתה ❌",
  };

  const statusColors: Record<string, string> = {
    assigned: "bg-secondary text-secondary-foreground",
    submitted: "bg-warning/20 text-warning-foreground",
    approved: "bg-success/20 text-success",
    rejected: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">היתרה שלי</p>
          <p className="mt-1 text-4xl font-bold">🪙 {balance}</p>
        </CardContent>
      </Card>

      {/* Tasks */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">המשימות שלי</h2>
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              אין משימות עדיין. ההורים יוסיפו בקרוב!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link key={task.id} to="/child/tasks/$taskId" params={{ taskId: task.id }}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                        {statusLabels[task.status]}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 font-bold text-coin-foreground">
                      🪙 {task.reward_amount}
                    </span>
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
