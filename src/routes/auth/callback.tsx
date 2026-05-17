import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The URL contains #access_token=...&refresh_token=... from the email link.
    // supabase-js reads these from the hash fragment automatically on getSession.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        console.error("[auth/callback] Session exchange failed:", error?.message);
        setError(error?.message ?? "שגיאה באימות הקישור");
        return;
      }
      // Confirmed — navigate to root which will redirect based on role
      navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-destructive text-sm">{error}</p>
          <a href="/login" className="text-primary underline text-sm">
            חזרה לדף ההתחברות
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <p className="text-muted-foreground text-sm">מאמת את החשבון...</p>
    </div>
  );
}
