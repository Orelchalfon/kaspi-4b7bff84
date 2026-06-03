import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Coins, LogOut, Menu } from "lucide-react";

export const Route = createFileRoute("/child")({
  component: ChildLayout,
});

const NAV_ITEMS = [
  { to: "/child/dashboard", label: "ראשי" },
  { to: "/child/educate", label: "לימוד" },
  { to: "/child/savings", label: "חיסכון" },
  { to: "/child/wallet", label: "ארנק" },
] as const;

function ChildLayout() {
  const { isAuthenticated, isLoading, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <Link
            to="/child/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-lg font-bold text-foreground">KidCoin</span>
          </Link>

          {/* Tablet and up: inline navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-12 items-center rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{ className: "bg-accent font-semibold text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="יציאה">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="ms-1 hidden sm:inline">יציאה</span>
            </Button>

            {/* Below tablet: hamburger menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-12 md:hidden"
                  aria-label="פתיחת תפריט"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="border-b px-4 py-4 text-start">
                  <SheetTitle className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Coins className="h-4 w-4" aria-hidden />
                    </span>
                    KidCoin
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3">
                  {NAV_ITEMS.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className="flex min-h-12 items-center rounded-md px-4 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        activeProps={{ className: "bg-accent font-semibold text-primary" }}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
