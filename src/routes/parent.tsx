import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const { isAuthenticated, isLoading, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    } else if (role !== null && role !== "parent") {
      navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, role, navigate]);

  if (isLoading || !isAuthenticated || role !== "parent") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-xl">🪙</span>
            <span className="text-lg font-bold text-foreground">KidCoin</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/parent/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              ראשי
            </Link>
            <Link
              to="/parent/children"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              ילדים
            </Link>
            <Link
              to="/parent/transactions"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              תנועות
            </Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={signOut}>
            יציאה
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
