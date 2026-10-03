import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle, Coins, LogIn, UserPlus } from "lucide-react";
import { AuthLoader } from "@/components/ui/auth-loader";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (!cancelled) {
          setError("הקישור לא תקף או שפג תוקפו. נסו להתחבר שוב.");
        }
        return;
      }

      try {
        // DB trigger handle_new_user already created household + user_roles
        // during auth.signUp. We just need to load the role into context.
        await refreshRole(session.user.id);
        if (cancelled) return;
        toast.success("ברוכים הבאים ל-Kasp!");
        // "/" sends each role to its own dashboard (this was hard-coded to /parent/dashboard).
        navigate({ to: "/", replace: true });
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("שגיאה בהשלמת ההרשמה. צרו קשר עם התמיכה.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshRole]);

  if (!error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <AuthLoader title="מאמת את החשבון..." subtitle="רגע אחד, מסיימים את ההרשמה." />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="size-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold text-foreground">לא הצלחנו לאמת את החשבון</h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="destructive" role="alert">
            <AlertCircle aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <Button asChild size="touch" className="w-full">
              <Link to="/login">
                <LogIn aria-hidden />
                חזרה להתחברות
              </Link>
            </Button>
            <Button asChild size="touch" variant="outline" className="w-full">
              <Link to="/signup">
                <UserPlus aria-hidden />
                הרשמה מחדש
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
