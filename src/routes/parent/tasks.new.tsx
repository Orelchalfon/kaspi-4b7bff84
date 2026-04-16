import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
      child_profile_id: childId,
      created_by: user.id,
      title,
      description: description || null,
      reward_amount: parseInt(reward, 10),
    });

    if (tError) {
      setError("שגיאה ביצירת משימה");
      setLoading(false);
      return;
    }

    navigate({ to: "/parent/dashboard" });
  };

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-sm">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>צריך להוסיף ילד לפני יצירת משימה.</p>
            <Button
              variant="link"
              onClick={() => navigate({ to: "/parent/children/new" })}
              className="mt-2"
            >
              הוסיפו ילד →
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="child">ילד</Label>
              <select
                id="child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
              <Label htmlFor="reward">תגמול (🪙 מטבעות)</Label>
              <Input
                id="reward"
                type="number"
                min="1"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="10"
                required
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "יוצר..." : "צור משימה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
