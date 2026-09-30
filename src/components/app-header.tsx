import { Link } from "@tanstack/react-router";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { Coins, LogOut, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { Separator } from "@/components/ui/separator";

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

const linkBase =
  "flex items-center gap-2 rounded-lg font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const linkActive = { className: "bg-accent font-semibold text-primary" };

/**
 * In-app navbar for the parent and child layouts. Same visual language as the landing
 * page's LandingNav: a floating rounded bar (sticky here, since app pages scroll their
 * content under it) and, below `md`, an animated toggle that opens a dropdown panel.
 */
export function AppHeader({ brand, navItems, onSignOut }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape or on a tap/click outside the header while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <LazyMotion features={domAnimation} strict>
      <header ref={headerRef} className="sticky top-0 z-40 px-4 pt-3">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          דלג לתוכן הראשי
        </a>

        <div className="mx-auto flex h-14 max-w-4xl flex-row-reverse items-center justify-between gap-2 rounded-2xl border border-border bg-background/85 px-3 shadow-lg backdrop-blur md:px-5">
          <Link
            to={brand.to}
            onClick={() => setOpen(false)}
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Coins className="size-5" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              <bdi>{brand.name}</bdi>
            </span>
          </Link>

          {/* Tablet and up: inline navigation */}
          <nav className="hidden md:block" aria-label="ניווט ראשי">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`${linkBase} min-h-11 px-3 text-sm`}
                    activeProps={linkActive}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            {/* Tablet and up: sign out */}
            <Button variant="ghost" onClick={onSignOut} className="hidden h-11 md:inline-flex">
              <LogOut aria-hidden />
              יציאה
            </Button>

            {/* Below tablet: animated menu toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
              aria-expanded={open}
              aria-controls="app-mobile-menu"
              className="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <MenuToggleIcon open={open} className="size-6" duration={reduceMotion ? 0 : 300} />
            </button>
          </div>
        </div>

        {/* Below tablet: dropdown panel under the bar (overlays the page, doesn't push it). */}
        <AnimatePresence>
          {open ? (
            <m.div
              id="app-mobile-menu"
              key="app-mobile-menu"
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: "easeOut" }}
              className="absolute inset-x-4 top-full mx-auto mt-2 max-w-4xl overflow-hidden rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:hidden"
            >
              <nav aria-label="ניווט ראשי (נייד)">
                <ul className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`${linkBase} min-h-12 gap-3 px-4 text-base`}
                        activeProps={linkActive}
                      >
                        {/* Icon first in the DOM → renders to the right of the label in RTL. */}
                        <item.icon className="size-5 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <Separator className="my-3" />
              <Button
                variant="ghost"
                size="touch"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="min-h-12 w-full justify-start gap-3 text-base text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:size-5"
              >
                <LogOut aria-hidden />
                יציאה
              </Button>
            </m.div>
          ) : null}
        </AnimatePresence>
      </header>
    </LazyMotion>
  );
}
