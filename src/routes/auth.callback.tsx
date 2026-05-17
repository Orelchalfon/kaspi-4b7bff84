import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";

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
        toast.success("ברוכים הבאים ל-Kaspi!");
        navigate({ to: "/parent/dashboard" });
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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-7 w-7" aria-hidden />
          </div>
          <CardTitle className="text-xl">
            {error ? "אופס" : "מאמת את החשבון..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">רגע אחד, מסיימים את ההרשמה.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
