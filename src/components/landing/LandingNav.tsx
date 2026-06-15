import { Link } from "@tanstack/react-router";
import { m, useMotionValueEvent, useScroll } from "framer-motion";
import { Coins } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const navLinks = [
  { label: "איך זה עובד", href: "#how-it-works" },
  { label: "חיסכון", href: "#savings" },
  { label: "מטרות", href: "#goals" },
  { label: "לימוד", href: "#educate" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const next = latest > 80;
    if (next !== scrolled) setScrolled(next);
  });

  return (
    <m.header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-200",
        scrolled
          ? "border-b border-foreground/5 bg-background/85 backdrop-blur"
          : "border-b border-transparent bg-transparent",
      )}
      initial={false}
    >
      <div className="mx-auto flex   h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Kaspii — דף הבית">
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
                  className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            כניסה
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            התחל בחינם
          </Link>
        </div>
      </div>
    </m.header>
  );
}
