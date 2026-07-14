import { m } from "framer-motion";
import { CheckCircle2, Mic } from "lucide-react";

import { fadeUpItem, staggerContainer, viewportOnce } from "./motion/variants";
import { TutorAvatarScene } from "./TutorAvatarScene";

export function AiTutor() {
  return (
    <section id="ai-tutor" aria-labelledby="ai-tutor-headline" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="rounded-3xl border border-foreground/5 bg-card p-6 md:p-10"
        >
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
            <m.div variants={fadeUpItem}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Mic className="h-3.5 w-3.5" aria-hidden />
                חונך קולי
              </span>

              <h2
                id="ai-tutor-headline"
                className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
              >
                חונך ש<span className="text-primary">מדבר איתו</span> — לא רק כותב לו.
              </h2>

              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                ההורה בוחר נושא, תת-נושא ואישיות — והילד מנהל שיחת קול חיה עם החונך, ממש כמו שיחת
                טלפון. זו לא הודעת טקסט וזה לא החידון של "לימוד": זו שיחה מודרכת שמלמדת צעד-צעד,
                בעברית, בקצב של הילד.
              </p>

              <ul className="mt-5 space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                  <span>שיחת קול אמיתית בזמן אמת — לא צ'אט טקסט.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                  <span>
                    ההורה קובע נושא, תת-נושא, אישיות (ידידותי / משעשע / רגוע / רציני) וקול.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
                  <span>
                    כללי בטיחות קבועים: לא שואל פרטים אישיים, לא נכנס לתוכן לא הולם, ומפנה להורה אם
                    צריך.
                  </span>
                </li>
              </ul>
            </m.div>

            <m.div variants={fadeUpItem} className="min-h-[320px] md:min-h-[380px]">
              <TutorAvatarScene />
            </m.div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
