import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Sign up the user
    console.log("[signup] starting signUp...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    console.log("[signup] signUp returned", { user: !!authData?.user, session: !!authData?.session, error: authError?.message });

    if (authError || !authData.user) {
      setError(authError?.message || "שגיאה בהרשמה");
      setLoading(false);
      return;
    }

    // If no session returned, the email may already exist or needs confirmation
    if (!authData.session) {
      setError("לא ניתן ליצור חשבון עם אימייל זה. נסו אימייל אחר או התחברו.");
      setLoading(false);
      return;
    }
    console.log("[signup] session confirmed, creating household...");

    const userId = authData.user.id;

    // Create household
    const { data: household, error: hError } = await supabase
      .from("households")
      .insert({ name: householdName, created_by: userId })
      .select("id")
      .single();

    if (hError || !household) {
      setError("שגיאה ביצירת משק בית");
      setLoading(false);
      return;
    }

    // Assign parent role
    const { error: rError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "parent", household_id: household.id });

    if (rError) {
      setError("שגיאה בהגדרת תפקיד");
      setLoading(false);
      return;
    }

    // Refresh role in auth context BEFORE navigating, otherwise the parent
    // layout guard sees role=null and bounces back to "/"
    await refreshRole();
    navigate({ to: "/parent/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-2 text-4xl">🪙</div>
          <CardTitle className="text-2xl">הרשמה</CardTitle>
          <CardDescription>צרו חשבון הורה חדש</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="household">שם המשפחה / משק הבית</Label>
              <Input
                id="household"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="משפחת כהן"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "נרשם..." : "הרשמה"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            כבר יש לכם חשבון?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              התחברות
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
