import { m } from "framer-motion";
import { Coins, Lock, ShieldCheck, EyeOff } from "lucide-react";

import { fadeUp, fadeUpItem, staggerContainer, viewportOnce } from "./motion/variants";

const cells = [
  {
    icon: Coins,
    title: "מטבעות וירטואליים בלבד",
    body: "אין חיבור לחשבון בנק. אין כסף אמיתי בתוך האפליקציה.",
  },
  {
    icon: ShieldCheck,
    title: "שליטה מלאה להורה",
    body: "כל תגמול עובר אישור. כל הגדרה נשלטת על-ידך.",
  },
  {
    icon: Lock,
    title: "בעברית, בלבד למשפחה",
    body: "המידע של המשפחה שלך מבודד מבתי-אב אחרים.",
  },
  {
    icon: EyeOff,
    title: "ללא פרסומות, לעולם",
    body: "המסך של הילד נקי. לא רואים פרסומות, לא נמכר מידע.",
  },
];

export function TrustStrip() {
  return (
    <section aria-labelledby="trust-headline" className="relative py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <m.h2
          id="trust-headline"
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          ארבע הבטחות שלא משתנות.
        </m.h2>

        <m.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
        >
          {cells.map((cell) => {
            const Icon = cell.icon;
            return (
              <m.li
                key={cell.title}
                variants={fadeUpItem}
                className="rounded-2xl border border-primary/8 bg-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{cell.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{cell.body}</p>
              </m.li>
            );
          })}
        </m.ul>
      </div>
    </section>
  );
}
