import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/parent/dashboard")({
  component: ParentDashboard,
});

interface ChildInfo {
  id: string;
  display_name: string;
  balance: number;
}

interface TaskInfo {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  child_name: string;
}

function ParentDashboard() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [pendingTasks, setPendingTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;

    async function load() {
      // Load children with balances
      const { data: childData } = await supabase
        .from("child_profiles")
        .select("id, display_name")
        .eq("household_id", householdId!);

      if (childData) {
        const childrenWithBalances = await Promise.all(
          childData.map(async (child) => {
            const { data: txData } = await supabase
              .from("transactions")
              .select("amount")
              .eq("child_profile_id", child.id);
            const balance = (txData || []).reduce((sum, t) => sum + t.amount, 0);
            return { ...child, balance };
          })
        );
        setChildren(childrenWithBalances);
      }

      // Load submitted tasks
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, title, reward_amount, status, child_profile_id")
        .eq("household_id", householdId!)
        .eq("status", "submitted");

      if (taskData && childData) {
        const mapped = taskData.map((t) => {
          const child = childData.find((c) => c.id === t.child_profile_id);
          return {
            id: t.id,
            title: t.title,
            reward_amount: t.reward_amount,
            status: t.status,
            child_name: child?.display_name || "",
          };
        });
        setPendingTasks(mapped);
      }

      setLoading(false);
    }

    load();
  }, [householdId]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <div className="flex gap-2">
          <Link to="/parent/children/new">
            <Button size="sm">+ ילד חדש</Button>
          </Link>
          <Link to="/parent/tasks/new">
            <Button size="sm" variant="outline">+ משימה</Button>
          </Link>
        </div>
      </div>

      {/* Children overview */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">ילדים</h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>עדיין לא הוספתם ילדים.</p>
              <Link to="/parent/children/new">
                <Button variant="link" className="mt-2">הוסיפו ילד ראשון →</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => (
              <Card key={child.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <span className="font-medium">{child.display_name}</span>
                  <span className="flex items-center gap-1 text-lg font-bold text-coin-foreground">
                    🪙 {child.balance}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pending tasks */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          משימות ממתינות לאישור
          {pendingTasks.length > 0 && (
            <span className="ms-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-warning text-xs font-bold text-warning-foreground">
              {pendingTasks.length}
            </span>
          )}
        </h2>
        {pendingTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              אין משימות ממתינות לאישור כרגע.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <Link key={task.id} to="/parent/tasks/$taskId" params={{ taskId: task.id }}>
                <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.child_name}</p>
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
