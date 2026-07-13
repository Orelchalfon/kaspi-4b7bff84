import { AppHeader, type NavItem } from "@/components/app-header";
import { useAuth } from "@/hooks/use-auth";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Bot, GraduationCap, Home, PiggyBank, Wallet } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/child")({
  component: ChildLayout,
});

const CHILD_NAV: readonly NavItem[] = [
  { to: "/child/dashboard", label: "ראשי", icon: Home },
  { to: "/child/educate", label: "לימוד", icon: GraduationCap },
  { to: "/child/tutors", label: "חונך", icon: Bot },
  { to: "/child/savings", label: "חיסכון", icon: PiggyBank },
  { to: "/child/wallet", label: "ארנק", icon: Wallet },
];

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
      <AppHeader
        brand={{ name: "Kaspii", to: "/child/dashboard" }}
        navItems={CHILD_NAV}
        onSignOut={signOut}
      />
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
