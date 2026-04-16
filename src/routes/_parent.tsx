import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_parent")({
  component: ParentLayout,
});

function ParentLayout() {
  const { isAuthenticated, isLoading, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate({ to: "/login" });
    return null;
  }

  if (role !== "parent") {
    navigate({ to: "/" });
    return null;
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
