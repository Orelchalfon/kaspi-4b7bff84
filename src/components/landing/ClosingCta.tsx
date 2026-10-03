import { Link } from "@tanstack/react-router";
import { m } from "framer-motion";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientBorderCard } from "@/components/ui/gradient-border-card";

import { ctaInteractions, fadeUp, viewportOnce } from "./motion/variants";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-headline" className="relative overflow-hidden bg-background">
      {/* Soft brand-blue glows behind the card give the frosted glass something to blur. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 m-auto size-[28rem] max-w-full rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute start-[15%] top-[20%] size-64 rounded-full bg-ks-cyan-soft blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 py-20 md:py-24">
        <m.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <GradientBorderCard contentClassName="px-6 py-12 text-center md:px-12 md:py-16">
            <h2
              id="closing-headline"
              className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl"
            >
              מוכנים להתחיל את השגרה החדשה?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              הרשמה לוקחת פחות מדקה, ולא דורשת פרטי תשלום.
            </p>

            <m.div {...ctaInteractions} className="mt-8 inline-block">
              <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base font-semibold">
                <Link to="/signup">התחל בחינם</Link>
              </Button>
            </m.div>
          </GradientBorderCard>
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
            <bdi>Kasp</bdi>
          </span>
          <span className="text-xs text-muted-foreground">© OCD&#123;ev&#125; 2026</span>
        </div>

        <nav aria-label="קישורי תחתית">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <li>
              <span className="cursor-default">מדיניות פרטיות</span>
            </li>
            <li>
              <span className="cursor-default">תנאי שימוש</span>
            </li>
            <li>
              <span className="cursor-default">יצירת קשר</span>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
