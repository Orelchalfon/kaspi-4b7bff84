import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DetailSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/parent/tasks/$taskId")({
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
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

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

        if (t.proof_image_path) {
          const { data: signed, error: signErr } = await supabase.storage
            .from("task-proofs")
            .createSignedUrl(t.proof_image_path, 3600);
          if (signErr) {
            console.error("createSignedUrl failed", signErr);
            setProofError("לא ניתן לטעון את התמונה. ייתכן שהקובץ נמחק או שאין הרשאה.");
          }
          setProofUrl(signed?.signedUrl ?? null);
        }
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

    toast.success("המשימה אושרה והמטבעות זוכו");
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

    toast.success("המשימה נדחתה");
    navigate({ to: "/parent/dashboard" });
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
            <span className="text-muted-foreground">ילד:</span>
            <span className="font-medium">{childName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">תגמול:</span>
            <CoinAmount value={task.reward_amount} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">סטטוס:</span>
            <StatusBadge status={task.status} />
          </div>

          {proofUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">תמונת הוכחה:</p>
              <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={proofUrl}
                  alt="תמונת הוכחה לביצוע המשימה"
                  className="w-full rounded-lg border object-cover"
                />
              </a>
            </div>
          )}

          {proofError && !proofUrl && (
            <div role="alert" className="rounded-md bg-warning/10 p-3 text-xs text-warning-foreground">
              {proofError}
            </div>
          )}

          {task.status === "submitted" && !task.proof_image_path && (
            <div className="rounded-md bg-warning/10 p-3 text-xs text-warning-foreground">
              לא צורפה תמונת הוכחה למשימה זו.
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {task.status === "submitted" && (
            <div className="flex gap-2">
              <Button
                className="min-h-11 flex-1 bg-success text-success-foreground hover:bg-success/90"
                onClick={handleApprove}
                disabled={acting}
              >
                <Check className="h-4 w-4" aria-hidden />
                <span className="ms-1.5">{acting ? "מאשר..." : "אשר"}</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="min-h-11 flex-1" disabled={acting}>
                    <X className="h-4 w-4" aria-hidden />
                    <span className="ms-1.5">דחה</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>לדחות את המשימה?</AlertDialogTitle>
                    <AlertDialogDescription>
                      פעולה זו לא תזכה את הילד במטבעות. ניתן לעדכן בהמשך אם תשנו את דעתכם.
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
