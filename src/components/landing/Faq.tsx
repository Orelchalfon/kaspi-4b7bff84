import { m } from "framer-motion";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { fadeUp, viewportOnce } from "./motion/variants";

const items = [
  {
    q: "אז הילד צובר כסף אמיתי?",
    a: "לא. המטבעות וירטואליים בלבד. המטרה היא להרגיל לתכנן ולחסוך, לא לחבר לבנק או להעביר כסף.",
  },
  {
    q: 'מה אם הילד מסמן "סיימתי" אבל לא באמת סיים?',
    a: "כל משימה צריכה אישור של ההורה לפני שהיא מזכה במטבעות. אפשר גם לדחות משימה ולבקש מהילד להשלים אותה שוב.",
  },
  {
    q: "איך מגדירים את אחוז החיסכון?",
    a: "בלוח הבקרה של ההורה יש שדה אחד (0 עד 100). השינוי חל על כל אישור משימה עתידי במשפחה.",
  },
  {
    q: "אפשר להוציא חזרה מהחיסכון לארנק?",
    a: "כרגע לא. החיסכון משמש רק למטרה שיצרתם, וזה חלק מהרעיון. אם יהיה ביקוש, נשקול להוסיף.",
  },
  {
    q: "איך עובדים החידונים, ומתי מקבלים מטבעות?",
    a: "החידון כולל 5 שאלות בנושא שההורה בחר, מותאמות לגיל ולכיתה של הילד. מי שעונה נכון על לפחות 80% מקבל מטבעות, פעם אחת בכל נושא ביום. גובה התגמול נקבע על ידי ההורה.",
  },
  {
    q: "השיחות עם החונך הקולי מוקלטות? ההורה יכול לראות מה נאמר?",
    a: "כן. כל שיחה נשמרת כתמליל שההורה יכול לפתוח בכל עת מלוח הבקרה. לחונך יש גם כללי בטיחות קבועים: הוא לא מבקש פרטים אישיים, לא נכנס לתוכן לא הולם, ומפנה למבוגר אחראי אם הילד משתף במצוקה.",
  },
  {
    q: "יש אפליקציה למובייל?",
    a: "האתר מותאם קודם כול לנייד ועובד מצוין בדפדפן של הטלפון. אפליקציה ייעודית תגיע בהמשך.",
  },
  {
    q: "עם כמה ילדים אפשר?",
    a: "בלי הגבלה במשפחה אחת. לכל ילד ארנק, קופת חיסכון ומטרות משלו.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-headline" className="relative py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-5 md:px-8">
        <m.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <p className="text-sm font-medium text-primary">שאלות נפוצות</p>
          <h2
            id="faq-headline"
            className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            שאלות של הורים, תשובות ישירות.
          </h2>
        </m.div>

        <m.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="mt-10"
        >
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="border-b border-foreground/8 last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-base font-medium text-foreground hover:no-underline md:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </m.div>
      </div>
    </section>
  );
}
