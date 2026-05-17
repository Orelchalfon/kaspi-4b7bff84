import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
import { DetailSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/child/tasks/$taskId")({
  component: ChildTaskDetail,
});

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
}

function ChildTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, title, description, reward_amount, status")
      .eq("id", taskId)
      .single()
      .then(({ data }) => {
        setTask((data as TaskRow) ?? null);
        setLoading(false);
      });
  }, [taskId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const { error: uError } = await supabase
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);

    if (uError) {
      console.error("[submit task]", uError);
      setError(import.meta.env.DEV ? `שגיאה: ${uError.message}` : "שגיאה בהגשת המשימה");
      setSubmitting(false);
      return;
    }

    toast.success("המשימה נשלחה לאישור!");
    navigate({ to: "/child/dashboard" });
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!task) {
    return <div className="text-muted-foreground">המשימה לא נמצאה</div>;
  }

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
            <CoinAmount value={task.reward_amount} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">סטטוס:</span>
            <StatusBadge status={task.status} />
          </div>

          {error && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {task.status === "assigned" && (
            <Button
              className="min-h-12 w-full text-base"
              onClick={handleSubmit}
              disabled={submitting}
            >
              <PartyPopper className="h-5 w-5" aria-hidden />
              <span className="ms-2">{submitting ? "שולח..." : "סיימתי!"}</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
