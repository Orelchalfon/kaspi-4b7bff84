import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KidCoin — מערכת תגמולים למשפחות" },
      { name: "description", content: "KidCoin עוזרת למשפחות להפוך מטלות בית לתגמולים: הורים מגדירים משימות, ילדים צוברים מטבעות ולומדים לחסוך." },
      { property: "og:title", content: "KidCoin — מערכת תגמולים למשפחות" },
      { property: "og:description", content: "הורים מגדירים משימות, ילדים צוברים מטבעות ולומדים לחסוך כסף." },
      { property: "og:url", content: "https://kidcoin.app/" },
      { name: "twitter:title", content: "KidCoin — מערכת תגמולים למשפחות" },
      { name: "twitter:description", content: "הורים מגדירים משימות, ילדים צוברים מטבעות ולומדים לחסוך כסף." },
    ],
    links: [{ rel: "canonical", href: "https://kidcoin.app/" }],
  }),
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
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">מעביר...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <Coins className="h-10 w-10" aria-hidden />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          KidCoin — מערכת תגמולים למשפחות
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          מערכת תגמולים למשפחות — הורים מגדירים משימות, ילדים צוברים מטבעות
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            הרשמה
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}
