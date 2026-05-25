import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Coins, LogOut } from "lucide-react";

export const Route = createFileRoute("/child")({
  component: ChildLayout,
});

function ChildLayout() {
  const { isAuthenticated, isLoading, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    } else if (role !== null && role !== "child") {
      navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, role, navigate]);

  if (isLoading || !isAuthenticated || role !== "child") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        דלג לתוכן הראשי
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/child/dashboard"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-lg font-bold text-foreground">KidCoin</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/child/dashboard"
              className="min-h-12 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-accent font-semibold text-primary" }}
            >
              ראשי
            </Link>
            <Link
              to="/child/savings"
              className="min-h-12 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-accent font-semibold text-primary" }}
            >
              חיסכון
            </Link>
            <Link
              to="/child/wallet"
              className="min-h-12 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-accent font-semibold text-primary" }}
            >
              ארנק
            </Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="יציאה">
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="ms-1 hidden sm:inline">יציאה</span>
          </Button>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
