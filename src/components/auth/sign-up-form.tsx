import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, Mail, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";

// Supabase rate-limits confirmation emails per address (~60 s), so the resend button waits
// out the same window instead of letting the user hit the limit error.
const RESEND_COOLDOWN_S = 60;

const confirmRedirectTo = () => `${window.location.origin}/auth/callback`;

interface SignUpFormProps {
  /** Shared with the sign-in form so the address survives a mode switch. */
  email: string;
  onEmailChange: (email: string) => void;
  /** Called by the "check your email" screen's back button. */
  onBackToSignIn: () => void;
  /** First field, focused by AuthSwitch after the user switches into this mode. */
  firstFieldRef?: RefObject<HTMLInputElement | null>;
}

export function SignUpForm({
  email,
  onEmailChange,
  onBackToSignIn,
  firstFieldRef,
}: SignUpFormProps) {
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirectTo() },
    });
    setResending(false);
    if (resendError) {
      const rateLimited =
        resendError.status === 429 || resendError.message.toLowerCase().includes("rate");
      toast.error(
        rateLimited ? "שלחנו מייל ממש עכשיו. נסו שוב בעוד דקה." : "לא הצלחנו לשלוח שוב. נסו שוב.",
      );
      if (rateLimited) setCooldown(RESEND_COOLDOWN_S);
      return;
    }
    toast.success("שלחנו שוב את מייל האימות");
    setCooldown(RESEND_COOLDOWN_S);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmRedirectTo(),
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
    setPassword("");
    setEmailSent(true);
    setCooldown(RESEND_COOLDOWN_S);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold text-foreground">בדקו את המייל</h1>
        <p role="status" className="text-sm text-muted-foreground">
          שלחנו קישור אימות אל{" "}
          <span dir="ltr" className="font-medium text-foreground">
            {email}
          </span>
          . לחצו על הקישור כדי להפעיל את החשבון.
        </p>
        <p className="text-sm text-muted-foreground">לא רואים את המייל? בדקו בתיקיית הספאם.</p>
        <Button
          type="button"
          size="touch"
          className="w-full"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
          {resending ? "שולח..." : cooldown > 0 ? `שלח שוב (${cooldown})` : "שלח שוב"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="w-full"
          onClick={() => {
            setEmailSent(false);
            onBackToSignIn();
          }}
        >
          <LogIn aria-hidden />
          חזרה להתחברות
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">הרשמה</h1>
        <p className="mt-1 text-sm text-muted-foreground">צרו חשבון הורה חדש</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-household">שם המשפחה / משק הבית</Label>
          <Input
            ref={firstFieldRef}
            id="signup-household"
            autoComplete="off"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="משפחת כהן"
            required
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-email">אימייל</Label>
          <div className="relative">
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="parent@example.com"
              required
              dir="ltr"
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
          <Label htmlFor="signup-password">סיסמה</Label>
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="לפחות 6 תווים"
            minLength={6}
            describedBy="signup-password-hint"
          />
          <p id="signup-password-hint" className="text-xs text-muted-foreground">
            לפחות 6 תווים
          </p>
        </div>
        <Button type="submit" size="touch" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {loading ? "נרשם..." : "הרשמה"}
        </Button>
      </form>
    </div>
  );
}
