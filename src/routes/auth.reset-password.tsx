import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertCircle, KeyRound, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AuthLoader } from "@/components/ui/auth-loader";
import { PasswordInput } from "@/components/auth/password-input";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [{ title: "איפוס סיסמה — Kaspii" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

const MIN_LENGTH = 6;

type Phase = "verifying" | "ready" | "invalid";

/** Reads a Supabase auth error out of the recovery link (`#error=…&error_description=…`). */
function linkError(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(
    window.location.hash.slice(1) || window.location.search.slice(1),
  );
  return params.get("error_description") ?? params.get("error");
}

/**
 * Landing page for "שכחתי סיסמה" emails (resetPasswordForEmail → redirectTo here).
 * supabase-js consumes the recovery token from the URL and opens a short-lived session;
 * the user then picks a new password, saved via auth.updateUser.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<"password" | "confirm" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (linkError()) {
      setPhase("invalid");
      return;
    }
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setPhase("ready");
    };

    // The recovery token is exchanged asynchronously; listen for the session it opens.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) markReady();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });
    // No session after a few seconds → the link was invalid, expired, or already used.
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        setPhase("invalid");
      }
    }, 6000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    if (password.length < MIN_LENGTH) {
      setFieldError("password");
      setError(`הסיסמה צריכה להכיל לפחות ${MIN_LENGTH} תווים.`);
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setFieldError("confirm");
      setError("הסיסמאות לא תואמות.");
      confirmRef.current?.focus();
      return;
    }
    setFieldError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      console.error("[reset-password] updateUser failed", updateError);
      const msg = updateError.message.toLowerCase();
      setError(
        msg.includes("different from the old")
          ? "הסיסמה החדשה חייבת להיות שונה מהקודמת."
          : msg.includes("pwned") || msg.includes("weak")
            ? "הסיסמה הזו חלשה מדי או נמצאה ברשימת סיסמאות שדלפו. בחרו סיסמה אחרת."
            : "לא הצלחנו לעדכן את הסיסמה. נסו שוב, או בקשו קישור חדש.",
      );
      return;
    }
    toast.success("הסיסמה עודכנה");
    // "/" routes each role to its own dashboard.
    navigate({ to: "/", replace: true });
  };

  if (phase === "verifying") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <AuthLoader title="מאמתים את הקישור..." subtitle="רגע אחד, מכינים את איפוס הסיסמה." />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="size-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {phase === "invalid" ? "הקישור לא תקף" : "בחירת סיסמה חדשה"}
          </h1>
          {phase === "ready" && (
            <p className="text-sm text-muted-foreground">בחרו סיסמה חדשה לחשבון שלכם.</p>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {phase === "invalid" ? (
            <>
              <Alert variant="destructive" role="alert">
                <AlertCircle aria-hidden />
                <AlertDescription>
                  הקישור לאיפוס הסיסמה פג תוקף או כבר נוצל. בקשו קישור חדש ממסך ההתחברות, דרך
                  &quot;שכחתי סיסמה&quot;.
                </AlertDescription>
              </Alert>
              <Button asChild size="touch" className="w-full">
                <Link to="/login">
                  <LogIn aria-hidden />
                  חזרה להתחברות
                </Link>
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">סיסמה חדשה</Label>
                <PasswordInput
                  inputRef={passwordRef}
                  id="new-password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (fieldError) setFieldError(null);
                  }}
                  autoComplete="new-password"
                  placeholder={`לפחות ${MIN_LENGTH} תווים`}
                  minLength={MIN_LENGTH}
                  invalid={fieldError === "password"}
                  describedBy={fieldError === "password" ? "reset-error" : "new-password-hint"}
                />
                <p id="new-password-hint" className="text-xs text-muted-foreground">
                  לפחות {MIN_LENGTH} תווים
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">אימות סיסמה</Label>
                <PasswordInput
                  inputRef={confirmRef}
                  id="confirm-password"
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    if (fieldError) setFieldError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="הקלידו שוב את הסיסמה"
                  invalid={fieldError === "confirm"}
                  describedBy={fieldError === "confirm" ? "reset-error" : undefined}
                />
              </div>
              {error && (
                <Alert variant="destructive" id="reset-error" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" size="touch" className="w-full" disabled={saving}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                {saving ? "שומר..." : "שמירת הסיסמה"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
