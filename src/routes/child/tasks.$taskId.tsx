import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, PartyPopper, RotateCw, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
import { DetailSkeleton, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";

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

const BACK = { to: "/child/dashboard", label: "חזרה למשימות" } as const;

function ChildTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    // maybeSingle: a missing task is data=null, not an error, so failures stay distinct.
    const { data, error: tError } = await supabase
      .from("tasks")
      .select("id, title, description, reward_amount, status")
      .eq("id", taskId)
      .maybeSingle();
    // 22P02 = malformed id in the URL → treat as "not found".
    if (tError && tError.code !== "22P02") {
      console.error("[child task] load failed", tError);
      setLoadFailed(true);
    } else {
      setTask((data as TaskRow) ?? null);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const { error: uError } = await supabase
      .from("tasks")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", taskId);

    if (uError) {
      console.error("[submit task]", uError);
      setError(
        import.meta.env.DEV ? `שגיאה: ${uError.message}` : "אופס, לא הצלחנו לשלוח. נסו שוב.",
      );
      setSubmitting(false);
      return;
    }

    toast.success("המשימה נשלחה לאישור!");
    navigate({ to: "/child/dashboard" });
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <PageHeaderSkeleton />
        <DetailSkeleton />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <PageHeader title="המשימה שלי" back={BACK} />
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את המשימה. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={() => void load()}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <PageHeader title="המשימה לא נמצאה" back={BACK} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <SearchX className="size-10 opacity-40" aria-hidden />
            <p>אולי המשימה נמחקה. בואו נחזור לרשימה.</p>
            <Button asChild size="touch">
              <Link to="/child/dashboard">למשימות שלי</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <PageHeader title={task.title} back={BACK} />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">תגמול</dt>
              <dd>
                <CoinAmount value={task.reward_amount} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">סטטוס</dt>
              <dd>
                <StatusBadge status={task.status} />
              </dd>
            </div>
          </dl>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {task.status === "assigned" && (
            <Button
              size="touch"
              className="min-h-12 w-full text-base [&_svg]:size-5"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <PartyPopper aria-hidden />
              )}
              {submitting ? "שולח..." : "סיימתי!"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
