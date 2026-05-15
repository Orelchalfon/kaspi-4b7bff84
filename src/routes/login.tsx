import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "התחברות — KidCoin" },
      { name: "description", content: "התחברו לחשבון KidCoin שלכם כדי לנהל משימות, מטבעות וחיסכון של המשפחה." },
      { property: "og:title", content: "התחברות — KidCoin" },
      { property: "og:description", content: "התחברו לחשבון KidCoin שלכם." },
      { property: "og:url", content: "https://kaspi.lovable.app/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kaspi.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setError("המייל עוד לא אומת. בדקו את תיבת הדואר ולחצו על הקישור.");
      } else {
        setError("אימייל או סיסמה שגויים");
      }
      setLoading(false);
      requestAnimationFrame(() => document.getElementById("password")?.focus());
      return;
    }

    toast.success("התחברת בהצלחה");
    // Let index page handle role-based redirect once auth state propagates
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <h1 className="sr-only">התחברות ל-KidCoin</h1>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl">התחברות</CardTitle>
          <CardDescription>הכנסו לחשבון KidCoin שלכם</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
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
              {error && (
                <p id="login-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "מתחבר..." : "התחברות"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            אין לכם חשבון?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              הרשמה
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
