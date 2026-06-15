import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import { Coins, LogOut, Menu, type LucideIcon } from "lucide-react";
import { useState } from "react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type AppHeaderProps = {
  brand: { name: string; to: string };
  navItems: readonly NavItem[];
  onSignOut: () => void;
};

export function AppHeader({ brand, navItems, onSignOut }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b bg-card">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        דלג לתוכן הראשי
      </a>
      <div className="mx-auto flex flex-row-reverse max-w-4xl items-center justify-between gap-2 px-4 py-3">
        <Link
          to={brand.to}
          className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coins className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-lg font-bold text-foreground">{brand.name}</span>
        </Link>

        {/* Tablet and up: inline navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-h-12 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeProps={{ className: "bg-accent font-semibold text-primary" }}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {/* Tablet and up: sign out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="hidden md:inline-flex"
            aria-label="יציאה"
          >
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
                <SheetTitle className="flex items-center justify-end gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Coins className="h-4 w-4" aria-hidden />
                  </span>
                  {brand.name}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className="flex min-h-12 items-center gap-2 rounded-md px-4 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      activeProps={{ className: "bg-accent font-semibold text-primary" }}
                    >
                      <item.icon className="h-5 w-5" aria-hidden />
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <Button variant="ghost" size="sm" onClick={onSignOut} aria-label="יציאה">
                  <LogOut className="h-4 w-4" aria-hidden />
                  <span className="ms-1">יציאה</span>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
