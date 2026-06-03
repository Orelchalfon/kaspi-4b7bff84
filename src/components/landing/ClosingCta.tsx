import { Link } from "@tanstack/react-router";
import { m } from "framer-motion";
import { Coins } from "lucide-react";

import { ctaInteractions, fadeUp, viewportOnce } from "./motion/variants";

export function ClosingCta() {
  return (
    <section
      aria-labelledby="closing-headline"
      className="relative overflow-hidden bg-[color:var(--ks-navy-deep)] text-background"
    >
      <div className="mx-auto max-w-3xl px-5 py-20 text-center md:py-24">
        <m.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <h2 id="closing-headline" className="text-3xl font-semibold tracking-tight md:text-5xl">
            מוכנים להתחיל את השגרה החדשה?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-background/70 md:text-base">
            הרשמה לוקחת פחות מדקה, ולא דורשת פרטי תשלום.
          </p>

          <m.div {...ctaInteractions} className="mt-8 inline-block">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-background px-6 text-base font-semibold text-[color:var(--ks-navy-deep)] shadow-sm transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ks-navy-deep)]"
            >
              התחל בחינם
            </Link>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-foreground/5 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 md:flex-row md:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Coins className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-foreground">
            <bdi>Kaspii</bdi>
          </span>
          <span className="text-xs text-muted-foreground">© OCD&#123;ev&#125; 2026</span>
        </div>

        <nav aria-label="קישורי תחתית">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <li>
              <span className="cursor-default opacity-60">מדיניות פרטיות</span>
            </li>
            <li>
              <span className="cursor-default opacity-60">תנאי שימוש</span>
            </li>
            <li>
              <span className="cursor-default opacity-60">יצירת קשר</span>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
