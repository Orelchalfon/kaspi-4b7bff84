import { z } from "zod";

// Shared validation for the add/edit goal dialogs. Mirrors the DB CHECKs on `goals`.
export const goalSchema = z
  .object({
    title: z.string().trim().min(1, "כותרת חובה").max(60, "עד 60 תווים"),
    target_amount: z.coerce
      .number({ invalid_type_error: "חייב להיות מספר" })
      .int("חייב להיות מספר שלם")
      .positive("חייב להיות חיובי")
      .max(100000, "עד 100,000"),
    cycle_amount: z.coerce
      .number({ invalid_type_error: "חייב להיות מספר" })
      .int("חייב להיות מספר שלם")
      .positive("חייב להיות חיובי"),
    cycle_period: z.enum(["day", "week", "month"]),
    auto_deposit: z.boolean(),
    auto_source: z.enum(["wallet", "savings"]),
  })
  .refine((d) => d.cycle_amount <= d.target_amount, {
    message: "סכום מחזורי לא יכול להיות גדול מהיעד",
    path: ["cycle_amount"],
  });

export type GoalFormValues = z.infer<typeof goalSchema>;
export type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>;

/** Editing can't drop the target below what's already been deposited. */
export function goalEditSchema(deposited: number) {
  return goalSchema.refine((d) => d.target_amount >= deposited, {
    message: `היעד לא יכול להיות נמוך מ־${deposited} שכבר הופקדו`,
    path: ["target_amount"],
  });
}

/** First issue message per top-level field. */
export function zodIssuesToErrors(issues: z.ZodIssue[]): GoalFormErrors {
  const errs: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString() ?? "";
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}
