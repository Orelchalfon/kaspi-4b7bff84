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
    a: "לא. מטבעות וירטואליים בלבד. המטרה היא הרגל של תכנון וחיסכון — לא חיבור לבנק או העברה של כסף ממש.",
  },
  {
    q: 'מה אם הילד מסמן "סיימתי" אבל לא באמת סיים?',
    a: "כל משימה צריכה אישור מההורה לפני שהיא מזכה במטבעות. אתה יכול גם לדחות משימה ולבקש מהילד להשלים שוב.",
  },
  {
    q: "איך מגדירים את אחוז החיסכון?",
    a: "בלוח הבקרה של ההורה יש שדה מספרי בודד (0–100). השינוי תקף לכל אישור משימה עתידי במשק הבית.",
  },
  {
    q: "אפשר להוציא חזרה מהחיסכון לארנק?",
    a: "כרגע לא. החיסכון יוצא רק לקראת מטרה שיצרת — וזה חלק מהרעיון. אם תהיה דרישה, נשקול להוסיף.",
  },
  {
    q: "השיחות עם החונך הקולי מוקלטות? ההורה יכול לראות מה נאמר?",
    a: "כן. כל שיחה נשמרת כתמליל שההורה יכול לפתוח מאוחר יותר מלוח הבקרה. לחונך יש גם כללי בטיחות קבועים: לא מבקש פרטים אישיים, לא נכנס לתוכן לא הולם, ומפנה למבוגר אחראי אם הילד משתף מצוקה.",
  },
  {
    q: "יש אפליקציה למובייל?",
    a: "האתר תוכנן מובייל-ראשון ועובד מצוין מהדפדפן של הטלפון. אפליקציה ייעודית תהיה בהמשך.",
  },
  {
    q: "עם כמה ילדים אפשר?",
    a: "בלי מגבלה במשק בית אחד. כל ילד מקבל ארנק וקופת חיסכון נפרדים, עם המטרות שלו.",
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
            שאלנו, ההורים שאלו.
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
