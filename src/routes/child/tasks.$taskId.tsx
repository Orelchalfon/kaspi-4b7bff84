import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PartyPopper, Camera, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
import { DetailSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/child/tasks/$taskId")({
  component: ChildTaskDetail,
});

function ChildTaskDetail() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { householdId } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const resetPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      setError("צריך לצלם תמונה כהוכחה לפני שליחה");
      return;
    }
    if (!householdId) {
      setError("שגיאה בטעינת פרטי המשתמש");
      return;
    }
    setSubmitting(true);
    setError("");

    // Upload proof image to storage
    const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${householdId}/${taskId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("task-proofs")
      .upload(path, photoFile, {
        contentType: photoFile.type || "image/jpeg",
        upsert: true,
      });

    if (upErr) {
      setError("שגיאה בהעלאת התמונה");
      setSubmitting(false);
      return;
    }

    const { data: rpcData, error: uError } = await supabase.rpc("submit_task", {
      _task_id: taskId,
      _proof_image_path: path,
    });

    if (uError || (rpcData as any)?.error) {
      setError("שגיאה בהגשת המשימה");
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
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                aria-label="צילום תמונת הוכחה"
              />

              {photoPreview ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">תמונת הוכחה:</p>
                  <img
                    src={photoPreview}
                    alt="תצוגה מקדימה של תמונת הוכחה"
                    className="w-full rounded-lg border object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 w-full"
                    onClick={resetPhoto}
                    disabled={submitting}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    <span className="ms-2">צלם שוב</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full text-base"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Camera className="h-5 w-5" aria-hidden />
                  <span className="ms-2">צלם תמונה</span>
                </Button>
              )}

              <Button
                className="min-h-12 w-full text-base"
                onClick={handleSubmit}
                disabled={submitting || !photoFile}
              >
                <PartyPopper className="h-5 w-5" aria-hidden />
                <span className="ms-2">{submitting ? "שולח..." : "סיימתי!"}</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
