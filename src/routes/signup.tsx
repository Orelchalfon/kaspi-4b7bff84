import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "הרשמה — KidCoin" },
      { name: "description", content: "פתחו חשבון הורה ב-KidCoin והתחילו לנהל משימות, מטבעות וחיסכון של הילדים." },
      { property: "og:title", content: "הרשמה — KidCoin" },
      { property: "og:description", content: "פתחו חשבון הורה חדש ב-KidCoin." },
      { property: "og:url", content: "https://kaspi.lovable.app/signup" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kaspi.lovable.app/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { household_name: householdName },
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? "";
      if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("pwned")) {
        setError("הסיסמה הזו נמצאת ברשימת סיסמאות שדלפו. בחרו סיסמה אחרת.");
      } else if (msg.toLowerCase().includes("already")) {
        setError("כתובת המייל כבר רשומה. נסו להתחבר.");
      } else {
        setError("שגיאה בהרשמה. נסו שוב.");
      }
      setLoading(false);
      return;
    }

    // Email-confirm flow: no session yet. Show "check your email" screen.
    toast.success("נשלח מייל אימות לכתובת שהזנת");
    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-7 w-7" aria-hidden />
            </div>
            <CardTitle className="text-2xl">בדקו את המייל</CardTitle>
            <CardDescription>
              שלחנו קישור אימות אל <span dir="ltr" className="font-medium">{email}</span>. לחצו על הקישור כדי להפעיל את החשבון.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              לא רואים את המייל? בדקו בתיקיית הספאם.
            </p>
            <Button variant="outline" className="min-h-11 w-full" onClick={() => { setEmailSent(false); navigate({ to: "/login" }); }}>
              חזרה להתחברות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <h1 className="sr-only">הרשמה ל-KidCoin</h1>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl">הרשמה</CardTitle>
          <CardDescription>צרו חשבון הורה חדש</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="household">שם המשפחה / משק הבית</Label>
              <Input
                id="household"
                autoComplete="off"
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
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  required
                  minLength={6}
                  dir="ltr"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">לפחות 6 תווים</p>
            </div>
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "נרשם..." : "הרשמה"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            כבר יש לכם חשבון?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              התחברות
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
