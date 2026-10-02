import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent, type RefObject } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

interface SignInFormProps {
  /** Shared with the sign-up form so the address survives a mode switch. */
  email: string;
  onEmailChange: (email: string) => void;
  /** First field, focused by AuthSwitch after the user switches into this mode. */
  firstFieldRef?: RefObject<HTMLInputElement | null>;
}

export function SignInForm({ email, onEmailChange, firstFieldRef }: SignInFormProps) {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const setEmailRefs = (el: HTMLInputElement | null) => {
    emailRef.current = el;
    if (firstFieldRef) firstFieldRef.current = el;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("הזינו אימייל ואז לחצו על 'שכחתי סיסמה'");
      requestAnimationFrame(() => emailRef.current?.focus());
      return;
    }
    setError("");
    setResetSending(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResetSending(false);
    if (resetErr) {
      setError("שגיאה בשליחת מייל איפוס. נסו שוב.");
      return;
    }
    setResetSent(true);
    toast.success("נשלח מייל לאיפוס סיסמה");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      console.error("[login] Supabase auth error:", error.message, error.status);
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setError("המייל עוד לא אומת. בדקו את תיבת הדואר ולחצו על הקישור.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
        setError("אימייל או סיסמה שגויים");
      } else if (msg.includes("too many requests") || error.status === 429) {
        setError("יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות.");
      } else {
        // Show real error in dev so we can debug; generic in prod
        setError(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בהתחברות. נסו שוב.");
      }
      setLoading(false);
      requestAnimationFrame(() => passwordRef.current?.focus());
      return;
    }

    toast.success("התחברת בהצלחה");
    // Let index page handle role-based redirect once auth state propagates
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">התחברות</h1>
        <p className="mt-1 text-sm text-muted-foreground">הכנסו לחשבון Kaspii שלכם</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email">אימייל</Label>
          <div className="relative">
            <Input
              ref={setEmailRefs}
              id="signin-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="parent@example.com"
              required
              dir="ltr"
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "signin-error" : undefined}
              // Same LTR-input/RTL-wrapper slot as PasswordInput so the two fields' text aligns.
              className="h-11 ps-12 transition-[padding,color,box-shadow]"
            />
            <Mail
              className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-password">סיסמה</Label>
          <PasswordInput
            inputRef={passwordRef}
            id="signin-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={!!error}
            describedBy={error ? "signin-error" : undefined}
          />
          {error && (
            <p id="signin-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-start">
            <Button
              type="button"
              variant="link"
              onClick={handleForgotPassword}
              disabled={resetSending || resetSent}
              className="-ms-2 h-11 px-2"
            >
              {resetSent ? (
                <Check aria-hidden />
              ) : resetSending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <KeyRound aria-hidden />
              )}
              {resetSent ? "נשלח" : resetSending ? "שולח..." : "שכחתי סיסמה"}
            </Button>
          </div>
        </div>

        <Button type="submit" size="touch" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {loading ? "מתחבר..." : "התחברות"}
        </Button>

        {resetSent && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            שלחנו קישור לאיפוס סיסמה ל-
            <span dir="ltr" className="font-medium">
              {email}
            </span>
            . בדקו את תיבת הדואר (וגם בספאם).
          </p>
        )}
      </form>
    </div>
  );
}
