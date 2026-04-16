import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && role === "parent") {
      navigate({ to: "/parent/dashboard" });
    } else if (isAuthenticated && role === "child") {
      navigate({ to: "/child/dashboard" });
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">מעביר...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 text-6xl">🪙</div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          KidCoin
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          מערכת תגמולים למשפחות — הורים מגדירים משימות, ילדים צוברים מטבעות
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            הרשמה
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}
