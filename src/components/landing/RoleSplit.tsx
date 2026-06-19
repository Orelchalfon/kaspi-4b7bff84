import { m } from "framer-motion";
import { Coins, Users, Wallet, CheckCircle2 } from "lucide-react";

import { fadeUp, fadeUpItem, staggerContainer, viewportOnce } from "./motion/variants";

export function RoleSplit() {
  return (
    <section aria-labelledby="role-headline" className="relative bg-muted/30 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="max-w-2xl"
        >
          <p className="text-sm font-medium text-primary">תפקידים</p>
          <h2
            id="role-headline"
            className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            מה רואה כל אחד.
          </h2>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            שני מסכים, שני תפקידים. ההורה רואה את כל הבית; הילד רואה רק את עצמו.
          </p>
        </m.div>

        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-2"
        >
          <m.div variants={fadeUpItem}>
            <RoleCard
              badge="הורה"
              badgeIcon={<Users className="h-3.5 w-3.5" aria-hidden />}
              headline="אתה."
              body="רואה את כל הילדים, מאשר משימות בלחיצה, קובע אחוז חיסכון אוטומטי, ועוקב אחרי תנועות המשק בית."
              accent="cyan"
              bullets={["אישור משימות אינליין", "אחוז חיסכון פר-משק-בית", "היסטוריית תנועות מלאה"]}
            />
          </m.div>
          <m.div variants={fadeUpItem}>
            <RoleCard
              badge="ילד"
              badgeIcon={<Wallet className="h-3.5 w-3.5" aria-hidden />}
              headline="הילד."
              body="רואה רק את עצמו — משימות, ארנק, חיסכון, מטרות. ממוקד, נטול פרסומות, ובעברית פשוטה."
              accent="gold"
              bullets={['כפתור "סיימתי!" אחד', "קופה נפרדת לחיסכון", "מטרות עם סכום מחזורי"]}
            />
          </m.div>
        </m.div>
      </div>
    </section>
  );
}

function RoleCard({
  badge,
  badgeIcon,
  headline,
  body,
  bullets,
  accent,
}: {
  badge: string;
  badgeIcon: React.ReactNode;
  headline: string;
  body: string;
  bullets: string[];
  accent: "cyan" | "gold";
}) {
  const accentStyle =
    accent === "cyan"
      ? { backgroundColor: "var(--ks-cyan-soft)" }
      : { backgroundColor: "var(--coin)" };
  const iconColor = accent === "cyan" ? "text-primary" : "text-[color:var(--coin-foreground)]";
  const badgeBg =
    accent === "cyan"
      ? "bg-primary/10 text-primary"
      : "bg-[color:var(--coin)]/15 text-[color:var(--coin-foreground)]";

  return (
    <article className="relative overflow-hidden rounded-3xl border border-foreground/5 bg-card p-6 md:p-8">
      <span aria-hidden className="absolute inset-y-0 start-0 w-1 md:w-1.5" style={accentStyle} />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 md:hidden" style={accentStyle} />

      <div className="ps-3 md:ps-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badgeBg}`}
        >
          {badgeIcon}
          {badge}
        </span>
        <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">{headline}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{body}</p>

        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
