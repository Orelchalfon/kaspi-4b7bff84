import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2, RotateCw, SearchX, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
import { DetailSkeleton, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/parent/tasks/$taskId")({
  component: ParentTaskDetail,
});

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  child_id: string;
}

const BACK = { to: "/parent/dashboard", label: "חזרה ללוח הבקרה" } as const;

function ParentTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    // maybeSingle: "no row" comes back as data=null without an error, so a real
    // request failure can be told apart from a task that doesn't exist.
    const { data: t, error: tError } = await supabase
      .from("tasks")
      .select("id, title, description, reward_amount, status, child_id")
      .eq("id", taskId)
      .maybeSingle();

    // 22P02 = malformed uuid in the URL: that's "not found", not a network failure.
    if (tError && tError.code !== "22P02") {
      console.error("[task detail] load failed", tError);
      setLoadFailed(true);
    } else if (t) {
      setTask(t as TaskRow);
      const { data: cp } = await supabase
        .from("child_profiles")
        .select("display_name")
        .eq("id", t.child_id)
        .single();
      setChildName(cp?.display_name || "");
    } else {
      setTask(null);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    setActing("approve");
    setError("");
    const { error: rpcError } = await supabase.rpc("approve_task_and_pay", {
      p_task_id: taskId,
    });

    if (rpcError) {
      console.error("[approve_task_and_pay]", rpcError);
      setError(import.meta.env.DEV ? `שגיאה: ${rpcError.message}` : "שגיאה באישור המשימה");
      setActing(null);
      return;
    }

    toast.success("המשימה אושרה והמטבעות זוכו");
    navigate({ to: "/parent/dashboard" });
  };

  const handleReject = async () => {
    setActing("reject");
    setError("");
    const { error: uError } = await supabase
      .from("tasks")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", taskId);

    if (uError) {
      console.error("[reject task]", uError);
      setError(import.meta.env.DEV ? `שגיאה: ${uError.message}` : "שגיאה בדחיית המשימה");
      setActing(null);
      return;
    }

    toast.success("המשימה נדחתה");
    navigate({ to: "/parent/dashboard" });
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
        <PageHeader title="פרטי משימה" back={BACK} />
        <Alert variant="destructive" role="alert">
          <AlertDescription>לא הצלחנו לטעון את המשימה. בדקו את החיבור ונסו שוב.</AlertDescription>
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
            <p>ייתכן שהמשימה נמחקה או שהקישור שגוי.</p>
            <Button asChild size="touch">
              <Link to="/parent/dashboard">ללוח הבקרה</Link>
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
              <dt className="text-muted-foreground">ילד</dt>
              <dd className="font-medium">{childName}</dd>
            </div>
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

          {task.status === "submitted" && (
            <div className="flex gap-2">
              <Button
                size="touch"
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleApprove}
                disabled={acting !== null}
              >
                {acting === "approve" ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Check aria-hidden />
                )}
                {acting === "approve" ? "מאשר..." : "אשר"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="touch"
                    variant="destructive"
                    className="flex-1"
                    disabled={acting !== null}
                  >
                    {acting === "reject" ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <X aria-hidden />
                    )}
                    {acting === "reject" ? "דוחה..." : "דחה"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>לדחות את המשימה?</AlertDialogTitle>
                    <AlertDialogDescription>
                      המשימה &quot;{task.title}&quot; תסומן כנדחתה והילד לא יזוכה במטבעות. לא ניתן
                      לבטל את הדחייה.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReject}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      דחה משימה
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
