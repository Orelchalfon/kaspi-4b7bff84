import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader, type NavItem } from "@/components/app-header";
import { LayoutDashboard, Receipt, Users } from "lucide-react";

export const Route = createFileRoute("/parent")({
  component: ParentLayout,
});

const PARENT_NAV: readonly NavItem[] = [
  { to: "/parent/dashboard", label: "ראשי", icon: LayoutDashboard },
  { to: "/parent/children", label: "ילדים", icon: Users },
  { to: "/parent/transactions", label: "תנועות", icon: Receipt },
];

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
      <div className="flex min-h-dvh items-center justify-center">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader
        brand={{ name: "KidCoin", to: "/parent/dashboard" }}
        navItems={PARENT_NAV}
        onSignOut={signOut}
      />
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
