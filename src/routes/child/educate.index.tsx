import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  Coins,
  Languages,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ListSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LEVEL_LABELS_HE,
  SUBJECT_LABELS_HE,
  isQuizSubject,
  levelForBirthdate,
  type QuizSubject,
} from "@/lib/quiz-bank";

export const Route = createFileRoute("/child/educate/")({
  component: ChildEducate,
});

interface AttemptRow {
  subject: string;
  paid: boolean;
  created_at: string;
}

const SUBJECT_ICON: Record<QuizSubject, LucideIcon> = {
  english: Languages,
  math: Calculator,
  torah: BookOpen,
  finance: Coins,
};

function todayKey(): string {
  // Asia/Jerusalem date as YYYY-MM-DD — matches the RPC index expression.
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function attemptDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function ChildEducate() {
  const { childProfileId, householdId, childBirthdate } = useAuth();
  const level = useMemo(() => levelForBirthdate(childBirthdate), [childBirthdate]);
  const [subjects, setSubjects] = useState<QuizSubject[]>([]);
  const [reward, setReward] = useState<number>(5);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    (async () => {
      const [{ data: sData }, { data: aData }] = await Promise.all([
        supabase
          .from("household_settings")
          .select("quiz_subjects, quiz_reward_amount")
          .eq("household_id", householdId)
          .maybeSingle(),
        supabase
          .from("quiz_attempts")
          .select("subject, paid, created_at")
          .eq("child_id", childProfileId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const raw = (sData?.quiz_subjects ?? []) as string[];
      setSubjects(raw.filter(isQuizSubject));
      setReward(sData?.quiz_reward_amount ?? 5);
      setAttempts((aData ?? []) as AttemptRow[]);
      setLoading(false);
    })();
  }, [childProfileId, householdId]);

  const today = todayKey();
  const paidToday = useMemo(() => {
    const set = new Set<string>();
    for (const a of attempts) {
      if (a.paid && attemptDateKey(a.created_at) === today) set.add(a.subject);
    }
    return set;
  }, [attempts, today]);

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Sparkles className="h-6 w-6 text-primary" aria-hidden />
          לימוד
        </h1>
        <p className="text-sm text-muted-foreground">
          חידון אחד מכל נושא ביום. עברת — תקבל תגמול אוטומטי.
        </p>
      </header>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-base">ההורה עדיין לא הגדיר נושאי לימוד.</p>
            <p className="mt-1 text-sm">בקשו ממנו להפעיל לפחות נושא אחד בלוח הבקרה.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subjects.map((s) => {
            const Icon = SUBJECT_ICON[s];
            const done = paidToday.has(s);
            return (
              <li key={s}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-4 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="leading-tight">
                          <p className="text-lg font-semibold text-foreground">
                            {SUBJECT_LABELS_HE[s]}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            חידון של 5 שאלות · רמת {LEVEL_LABELS_HE[level]}
                          </p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[color:var(--coin)]/15 px-2.5 py-1 text-xs font-semibold text-[color:var(--coin-foreground)]"
                        style={{ fontFeatureSettings: '"tnum"' }}
                      >
                        <Coins className="h-3 w-3" aria-hidden />+{reward}
                      </span>
                    </div>

                    <div className="mt-auto">
                      {done ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Check className="h-4 w-4" aria-hidden />
                            נצבר היום
                          </span>
                          <span className="text-xs text-success/80">חזרו מחר</span>
                        </div>
                      ) : (
                        <Link
                          to="/child/educate/$subject"
                          params={{ subject: s }}
                          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          התחל חידון
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        רענון יומי. אם לא הצלחת — תוכל לנסות שוב מיד.
      </p>
    </div>
  );
}
