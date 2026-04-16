import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/parent/children/new")({
  component: NewChild,
});

function NewChild() {
  const { householdId } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId) return;
    setError("");
    setLoading(true);

    // Create child auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (authError || !authData.user) {
      setError(authError?.message || "שגיאה ביצירת חשבון");
      setLoading(false);
      return;
    }

    const childUserId = authData.user.id;

    // Assign child role
    const { error: rError } = await supabase
      .from("user_roles")
      .insert({ user_id: childUserId, role: "child", household_id: householdId });

    if (rError) {
      setError("שגיאה בהגדרת תפקיד ילד");
      setLoading(false);
      return;
    }

    // Create child profile
    const { error: cpError } = await supabase
      .from("child_profiles")
      .insert({
        user_id: childUserId,
        household_id: householdId,
        display_name: displayName,
      });

    if (cpError) {
      setError("שגיאה ביצירת פרופיל ילד");
      setLoading(false);
      return;
    }

    // Re-login as parent (signUp logs in as new user)
    // We need to sign the parent back in - redirect to login
    // Actually, supabase.auth.signUp in this context might sign out the parent.
    // We should warn the parent to re-login after creating a child.
    navigate({ to: "/parent/children" });
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>הוספת ילד</CardTitle>
          <CardDescription>צרו חשבון לילד כדי שיוכל להתחבר ולבצע משימות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">שם הילד</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="יוסי"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל לילד</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="child@example.com"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה לילד</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <div className="rounded-md bg-warning/10 p-3 text-sm text-warning-foreground">
              ⚠️ שימו לב: לאחר יצירת הילד תצטרכו להתחבר מחדש לחשבון שלכם
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "יוצר..." : "צור חשבון ילד"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
