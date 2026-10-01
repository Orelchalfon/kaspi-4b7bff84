import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/parent/tasks/new")({
  component: NewTask,
});

interface ChildOption {
  id: string;
  display_name: string;
}

type FieldErrors = Partial<Record<"title" | "reward", string>>;

function NewTask() {
  const { householdId, user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildOption[]>([]);
  // Distinguishes "still loading" from "household really has no children", so the
  // empty state doesn't flash before the query returns.
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from("child_profiles")
      .select("id, display_name")
      .eq("household_id", householdId)
      .order("display_name", { ascending: true })
      .then(({ data }) => {
        setChildren(data || []);
        if (data && data.length > 0) setChildId(data[0].id);
        setChildrenLoaded(true);
      });
  }, [householdId]);

  const validate = (): { errors: FieldErrors; rewardAmount: number } => {
    const errors: FieldErrors = {};
    if (!title.trim()) errors.title = "כתבו כותרת למשימה";
    const rewardAmount = Number(reward);
    if (!reward.trim() || !Number.isInteger(rewardAmount) || rewardAmount <= 0) {
      errors.reward = "התגמול חייב להיות מספר שלם גדול מ-0";
    }
    return { errors, rewardAmount };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId || !user || loading) return;
    setError("");

    const { errors, rewardAmount } = validate();
    setFieldErrors(errors);
    if (errors.title || errors.reward) {
      // Move focus to the first invalid field so the message is announced in context.
      document.getElementById(errors.title ? "title" : "reward")?.focus();
      return;
    }

    setLoading(true);
    const { error: tError } = await supabase.from("tasks").insert({
      household_id: householdId,
      child_id: childId,
      created_by_parent_id: user.id,
      title: title.trim(),
      description: description || null,
      reward_amount: rewardAmount,
    });

    if (tError) {
      console.error("[tasks.new] insert failed:", tError);
      setError(
        import.meta.env.DEV ? `שגיאה ביצירת משימה: ${tError.message}` : "שגיאה ביצירת משימה",
      );
      setLoading(false);
      return;
    }

    toast.success("המשימה נוצרה בהצלחה");
    navigate({ to: "/parent/dashboard" });
  };

  const header = (
    <PageHeader title="משימה חדשה" back={{ to: "/parent/dashboard", label: "חזרה ללוח הבקרה" }} />
  );

  if (!childrenLoaded) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        {header}
        <FormSkeleton fields={4} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="size-10 opacity-40" aria-hidden />
            <p>צריך להוסיף ילד לפני יצירת משימה.</p>
            <Button asChild variant="link" className="mt-1 h-11">
              <Link to="/parent/children/new">
                הוסיפו ילד
                <ArrowLeft aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      {header}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="child">ילד</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger id="child" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">כותרת המשימה</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFieldErrors((f) => ({ ...f, title: undefined }));
                }}
                placeholder="לסדר את החדר"
                required
                autoComplete="off"
                aria-invalid={!!fieldErrors.title || undefined}
                aria-describedby={fieldErrors.title ? "title-error" : undefined}
                className="h-11"
              />
              {fieldErrors.title && (
                <p id="title-error" className="text-xs text-destructive">
                  {fieldErrors.title}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="desc">תיאור (אופציונלי)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פרטים נוספים על המשימה..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reward">תגמול במטבעות</Label>
              <Input
                id="reward"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={reward}
                onChange={(e) => {
                  setReward(e.target.value);
                  setFieldErrors((f) => ({ ...f, reward: undefined }));
                }}
                placeholder="10"
                required
                dir="ltr"
                aria-invalid={!!fieldErrors.reward || undefined}
                aria-describedby={fieldErrors.reward ? "reward-error reward-hint" : "reward-hint"}
                className="h-11 tabular-nums"
              />
              {fieldErrors.reward && (
                <p id="reward-error" className="text-xs text-destructive">
                  {fieldErrors.reward}
                </p>
              )}
              <p id="reward-hint" className="text-xs text-muted-foreground">
                כמה מטבעות הילד יקבל אחרי שהמשימה תאושר
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" size="touch" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" aria-hidden />}
                {loading ? "יוצר..." : "צור משימה"}
              </Button>
              <Button asChild variant="ghost" size="touch" className="w-full">
                <Link to="/parent/dashboard">ביטול</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
