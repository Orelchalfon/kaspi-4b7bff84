import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import {
  Bot,
  Coins,
  GraduationCap,
  ListChecks,
  LogIn,
  PiggyBank,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { cn } from "@/lib/utils";

// Icons mirror the in-app navbar (GraduationCap = לימוד, Bot = חונך, PiggyBank = חיסכון).
const navLinks: readonly { label: string; href: string; icon: LucideIcon }[] = [
  { label: "איך זה עובד", href: "#how-it-works", icon: ListChecks },
  { label: "חיסכון", href: "#savings", icon: PiggyBank },
  { label: "מטרות", href: "#goals", icon: Target },
  { label: "לימוד", href: "#educate", icon: GraduationCap },
  { label: "חונך קולי", href: "#ai-tutor", icon: Bot },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 24;
    if (next !== scrolled) setScrolled(next);
  });

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
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
    <m.header ref={headerRef} className="fixed inset-x-0 top-0 z-40 px-4" initial={false}>
      <div
        className={cn(
          "mx-auto flex flex-row-reverse items-center justify-between gap-2 px-5 transition-all duration-300 ease-out motion-reduce:transition-none md:px-8",
          scrolled || open
            ? "mt-3 h-14 max-w-4xl rounded-2xl border border-border bg-background/85 shadow-lg backdrop-blur"
            : "mt-0 h-16 max-w-6xl border border-transparent bg-transparent",
        )}
      >
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Kaspii — דף הבית"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coins className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">
            <bdi>Kaspii</bdi>
          </span>
        </Link>

        <nav className="hidden md:block" aria-label="ניווט ראשי">
          <ul className="flex items-center gap-8 text-sm text-muted-foreground">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-md transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-row-reverse items-center gap-2">
          <Link
            to="/login"
            className="hidden h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            כניסה
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            התחל בחינם
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            className="inline-flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <MenuToggleIcon open={open} className="size-6" duration={reduceMotion ? 0 : 300} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <m.div
            id="landing-mobile-menu"
            key="landing-mobile-menu"
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: "easeOut" }}
            className="mx-auto mt-2 max-w-4xl overflow-hidden rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:hidden"
          >
            <nav aria-label="ניווט ראשי (נייד)">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center gap-3 rounded-lg px-4 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <link.icon className="size-5 shrink-0 text-primary" aria-hidden />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border px-4 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogIn className="size-5 shrink-0" aria-hidden />
                כניסה
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Sparkles className="size-5 shrink-0" aria-hidden />
                התחל בחינם
              </Link>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.header>
  );
}
