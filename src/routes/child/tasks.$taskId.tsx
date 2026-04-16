import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/child/tasks/$taskId")({
  component: ChildTaskDetail,
});

function ChildTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()
      .then(({ data }) => {
        setTask(data);
        setLoading(false);
      });
  }, [taskId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    const { error: uError } = await supabase
      .from("tasks")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (uError) {
      setError("שגיאה בהגשת המשימה");
      setSubmitting(false);
      return;
    }

    navigate({ to: "/child/dashboard" });
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  if (!task) {
    return <div className="text-muted-foreground">המשימה לא נמצאה</div>;
  }

  const statusLabels: Record<string, string> = {
    assigned: "ממתינה לביצוע",
    submitted: "הוגשה — ממתינה לאישור",
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

          {task.status === "assigned" && (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "שולח..." : "סיימתי! הגש משימה 🎉"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
