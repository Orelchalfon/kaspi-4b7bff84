import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/parent/tasks/new")({
  component: NewTask,
});

interface ChildOption {
  id: string;
  display_name: string;
}

function NewTask() {
  const { householdId, user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from("child_profiles")
      .select("id, display_name")
      .eq("household_id", householdId)
      .then(({ data }) => {
        setChildren(data || []);
        if (data && data.length > 0) setChildId(data[0].id);
      });
  }, [householdId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId || !user) return;
    setError("");
    setLoading(true);

    const { error: tError } = await supabase.from("tasks").insert({
      household_id: householdId,
      child_id: childId,
      created_by_parent_id: user.id,
      title,
      description: description || null,
      reward_amount: parseInt(reward, 10),
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

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" aria-hidden />
            <p>צריך להוסיף ילד לפני יצירת משימה.</p>
            <Button
              variant="link"
              onClick={() => navigate({ to: "/parent/children/new" })}
              className="mt-1"
            >
              הוסיפו ילד
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>משימה חדשה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="child">ילד</Label>
              <select
                id="child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">כותרת המשימה</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לסדר את החדר"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">תיאור (אופציונלי)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="פרטים נוספים על המשימה..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward">תגמול במטבעות</Label>
              <Input
                id="reward"
                type="number"
                min="1"
                inputMode="numeric"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="10"
                required
                dir="ltr"
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                כמה מטבעות הילד יקבל אחרי שהמשימה תאושר
              </p>
            </div>
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "יוצר..." : "צור משימה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
