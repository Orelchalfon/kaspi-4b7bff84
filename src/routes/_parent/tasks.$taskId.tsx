import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_parent/tasks/$taskId")({
  component: ParentTaskDetail,
});

function ParentTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (t) {
        setTask(t);
        const { data: cp } = await supabase
          .from("child_profiles")
          .select("display_name")
          .eq("id", t.child_profile_id)
          .single();
        setChildName(cp?.display_name || "");
      }
      setLoading(false);
    }
    load();
  }, [taskId]);

  const handleApprove = async () => {
    setActing(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("approve_task", {
      _task_id: taskId,
    });

    if (rpcError) {
      setError("שגיאה באישור המשימה");
      setActing(false);
      return;
    }

    const result = data as any;
    if (result?.error) {
      setError(result.error);
      setActing(false);
      return;
    }

    navigate({ to: "/parent/dashboard" });
  };

  const handleReject = async () => {
    setActing(true);
    setError("");
    const { error: uError } = await supabase
      .from("tasks")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (uError) {
      setError("שגיאה בדחיית המשימה");
      setActing(false);
      return;
    }

    navigate({ to: "/parent/dashboard" });
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  if (!task) {
    return <div className="text-muted-foreground">המשימה לא נמצאה</div>;
  }

  const statusLabels: Record<string, string> = {
    assigned: "הוקצתה",
    submitted: "הוגשה",
    approved: "אושרה ✅",
    rejected: "נדחתה ❌",
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ילד:</span>
            <span className="font-medium">{childName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">תגמול:</span>
            <span className="font-bold text-coin-foreground">🪙 {task.reward_amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">סטטוס:</span>
            <span className="font-medium">{statusLabels[task.status] || task.status}</span>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {task.status === "submitted" && (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleApprove}
                disabled={acting}
              >
                {acting ? "..." : "אשר ✅"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={acting}
              >
                {acting ? "..." : "דחה ❌"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
