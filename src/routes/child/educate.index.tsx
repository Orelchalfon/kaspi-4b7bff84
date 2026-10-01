import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  Coins,
  Languages,
  Play,
  RotateCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { PageHeader } from "@/components/page-header";
import { ListSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BAND_LABELS_HE,
  QUIZ_LENGTH,
  SUBJECT_LABELS_HE,
  bandForBirthdate,
  isQuizSubject,
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
  const band = useMemo(() => bandForBirthdate(childBirthdate), [childBirthdate]);
  const [subjects, setSubjects] = useState<QuizSubject[]>([]);
  const [reward, setReward] = useState<number>(5);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    setLoadFailed(false);
    const [sRes, aRes] = await Promise.all([
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
    if (sRes.error || aRes.error) {
      console.error("[child/educate] load failed", sRes.error ?? aRes.error);
      setLoadFailed(true);
      setLoading(false);
      return;
    }
    const raw = (sRes.data?.quiz_subjects ?? []) as string[];
    setSubjects(raw.filter(isQuizSubject));
    setReward(sRes.data?.quiz_reward_amount ?? 5);
    setAttempts((aRes.data ?? []) as AttemptRow[]);
    setLoading(false);
  }, [childProfileId, householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayKey();
  const paidToday = useMemo(() => {
    const set = new Set<string>();
    for (const a of attempts) {
      if (a.paid && attemptDateKey(a.created_at) === today) set.add(a.subject);
    }
    return set;
  }, [attempts, today]);

  const header = (
    <PageHeader
      title="לימוד"
      icon={Sparkles}
      description="חידון אחד מכל נושא ביום. עברת — תקבל תגמול אוטומטי."
    />
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את החידונים. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={() => void load()}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-base">ההורה עדיין לא הגדיר נושאי לימוד.</p>
            <p className="mt-1 text-sm">בקשו ממנו להפעיל לפחות נושא אחד בלוח הבקרה.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subjects.map((s, i) => {
            const Icon = SUBJECT_ICON[s];
            const done = paidToday.has(s);
            return (
              <StaggerItem key={s} index={i}>
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
                            חידון של {QUIZ_LENGTH} שאלות · רמת {BAND_LABELS_HE[band]}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coin/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-coin-foreground">
                        <Coins className="size-3" aria-hidden />+{reward}
                        <span className="sr-only"> מטבעות</span>
                      </span>
                    </div>

                    <div className="mt-auto">
                      {done ? (
                        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Check className="h-4 w-4" aria-hidden />
                            נצבר היום
                          </span>
                          <span className="text-xs text-success/80">חזרו מחר</span>
                        </div>
                      ) : (
                        <Button asChild size="touch" className="w-full font-semibold">
                          <Link to="/child/educate/$subject" params={{ subject: s }}>
                            <Play aria-hidden />
                            התחל חידון
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}

      <p className="text-center text-xs text-muted-foreground">
        רענון יומי. אם לא הצלחת — תוכל לנסות שוב מיד.
      </p>
    </div>
  );
}
