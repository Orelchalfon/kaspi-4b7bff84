import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Coins,
  Loader2,
  PiggyBank,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BAND_LABELS_HE,
  QUIZ_LENGTH,
  SUBJECT_LABELS_HE,
  bandForBirthdate,
  getRandomQuiz,
  isQuizSubject,
  type QuizQuestion,
  type QuizSubject,
} from "@/lib/quiz-bank";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/educate/$subject")({
  component: ChildQuizPage,
});

type Phase = "loading" | "invalid" | "quiz" | "submitting" | "result";

interface PassPaid {
  passed: true;
  paid: true;
  reward: number;
  wallet_delta: number;
  savings_delta: number;
}
interface PassNotPaid {
  passed: true;
  paid: false;
  reason: "already_paid_today";
}
interface Fail {
  passed: false;
  paid: false;
  reason: "did_not_pass";
  correct: number;
}
type Result = PassPaid | PassNotPaid | Fail;

function ChildQuizPage() {
  const { subject } = useParams({ from: "/child/educate/$subject" });
  const navigate = useNavigate();
  const { householdId, childProfileId, childBirthdate } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  const validSubject: QuizSubject | null = isQuizSubject(subject) ? subject : null;
  const band = useMemo(() => bandForBirthdate(childBirthdate), [childBirthdate]);

  useEffect(() => {
    // Wait for the child profile too — the birthdate decides the quiz level.
    if (!householdId || !childProfileId) return;
    if (!validSubject) {
      setPhase("invalid");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("household_settings")
        .select("quiz_subjects")
        .eq("household_id", householdId)
        .maybeSingle();
      const enabled = (data?.quiz_subjects ?? []) as string[];
      if (!enabled.includes(validSubject)) {
        setPhase("invalid");
        return;
      }
      const qs = getRandomQuiz(validSubject, band, QUIZ_LENGTH);
      setQuestions(qs);
      setPicked(Array<null>(qs.length).fill(null));
      setCurrentIdx(0);
      setPhase("quiz");
    })();
  }, [householdId, childProfileId, validSubject, band]);

  const subjectLabel = validSubject ? SUBJECT_LABELS_HE[validSubject] : "";

  const currentQuestion = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const hasPicked = picked[currentIdx] !== null;

  const selectChoice = (choiceIdx: number) => {
    setPicked((prev) => {
      const next = [...prev];
      next[currentIdx] = choiceIdx;
      return next;
    });
  };

  const goNext = () => {
    if (!hasPicked) return;
    setCurrentIdx((i) => i + 1);
  };

  const submit = async () => {
    if (!validSubject) return;
    const correct = picked.reduce<number>((acc, choice, i) => {
      if (choice !== null && choice === questions[i]?.correctIndex) return acc + 1;
      return acc;
    }, 0);
    setPhase("submitting");
    const { data, error } = await supabase.rpc("complete_quiz_and_pay", {
      _subject: validSubject,
      _correct: correct,
      _total: questions.length,
    });
    if (error || !data) {
      console.error("[complete_quiz_and_pay]", error);
      toast.error(
        import.meta.env.DEV ? `שגיאה: ${error?.message ?? "unknown"}` : "שגיאה בשליחת התוצאות",
      );
      setPhase("quiz");
      return;
    }
    const payload = data as Record<string, unknown>;
    if (typeof payload.error === "string") {
      toast.error(`שגיאה: ${payload.error}`);
      setPhase("quiz");
      return;
    }
    if (payload.passed === true && payload.paid === true) {
      setResult({
        passed: true,
        paid: true,
        reward: Number(payload.reward ?? 0),
        wallet_delta: Number(payload.wallet_delta ?? 0),
        savings_delta: Number(payload.savings_delta ?? 0),
      });
    } else if (payload.passed === true && payload.paid === false) {
      setResult({ passed: true, paid: false, reason: "already_paid_today" });
    } else {
      setResult({ passed: false, paid: false, reason: "did_not_pass", correct });
    }
    setPhase("result");
  };

  const retry = () => {
    if (!validSubject) return;
    const qs = getRandomQuiz(validSubject, band, QUIZ_LENGTH);
    setQuestions(qs);
    setPicked(Array<null>(qs.length).fill(null));
    setCurrentIdx(0);
    setResult(null);
    setPhase("quiz");
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">טוען חידון...</div>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-base text-foreground">הנושא הזה לא פעיל כרגע.</p>
          <p className="mt-1 text-sm text-muted-foreground">בקשו מההורה להפעיל אותו.</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => navigate({ to: "/child/educate" })}
          >
            חזרה ללימוד
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "result" && result) {
    return <ResultScreen result={result} subjectLabel={subjectLabel} onRetry={retry} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          to="/child/educate"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          חזרה
        </Link>
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{subjectLabel}</div>
          <div className="text-[11px] text-muted-foreground">{BAND_LABELS_HE[band]}</div>
        </div>
        <span
          className="text-xs font-medium tabular-nums text-muted-foreground"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {currentIdx + 1} / {questions.length}
        </span>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full w-full origin-right rounded-full bg-primary transition-transform duration-300 ease-out"
          style={{
            transform: `scaleX(${(currentIdx + (hasPicked ? 1 : 0)) / questions.length})`,
          }}
          aria-hidden
        />
      </div>

      {currentQuestion && (
        <Card>
          <CardContent className="space-y-5 py-6">
            <h2 className="text-xl leading-snug font-semibold text-foreground md:text-2xl">
              {currentQuestion.prompt}
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {currentQuestion.choices.map((choice, idx) => {
                const isPicked = picked[currentIdx] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectChoice(idx)}
                    className={cn(
                      "min-h-12 rounded-lg border px-4 py-3 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-base",
                      isPicked
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border bg-card text-foreground hover:bg-accent",
                    )}
                    aria-pressed={isPicked}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        {isLast ? (
          <Button className="min-h-12" onClick={submit} disabled={!hasPicked || phase !== "quiz"}>
            {phase === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="ms-1.5">שולח...</span>
              </>
            ) : (
              "סיים"
            )}
          </Button>
        ) : (
          <Button className="min-h-12" onClick={goNext} disabled={!hasPicked}>
            הבא
          </Button>
        )}
      </div>
    </div>
  );
}

function ResultScreen({
  result,
  subjectLabel,
  onRetry,
}: {
  result: Result;
  subjectLabel: string;
  onRetry: () => void;
}) {
  if (result.passed && result.paid) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-foreground">כל הכבוד!</h2>
          <p className="text-sm text-muted-foreground">עברת את החידון ב{subjectLabel}.</p>
          <div className="mx-auto flex max-w-sm flex-col gap-2 rounded-xl border border-foreground/5 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-[color:var(--coin)]" aria-hidden />
                לארנק
              </span>
              <span
                className="text-lg font-bold text-foreground"
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                +{result.wallet_delta}
              </span>
            </div>
            {result.savings_delta > 0 && (
              <div className="flex items-center justify-between border-t border-foreground/5 pt-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PiggyBank className="h-4 w-4 text-primary" aria-hidden />
                  לחיסכון
                </span>
                <span
                  className="text-lg font-bold text-primary"
                  style={{ fontFeatureSettings: '"tnum"' }}
                >
                  +{result.savings_delta}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-center">
            <Link
              to="/child/educate"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              חזרה ללימוד
            </Link>
            <Link
              to="/child/wallet"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              לארנק שלי
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.passed && !result.paid) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold text-foreground">כל הכבוד!</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            עברת את החידון ב{subjectLabel}. היום כבר נצבר תגמול בנושא הזה — אפשר לנסות שוב מחר.
          </p>
          <Link
            to="/child/educate"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה ללימוד
          </Link>
        </CardContent>
      </Card>
    );
  }

  // did_not_pass
  return (
    <Card>
      <CardContent className="space-y-4 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="h-8 w-8" aria-hidden />
        </div>
        <h2 className="text-2xl font-bold text-foreground">כמעט שם</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          ענית נכון על {result.correct} מתוך {QUIZ_LENGTH}. צריך לפחות 4 כדי לעבור — בוא ננסה שוב.
        </p>
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button className="min-h-11" onClick={onRetry}>
            <BookOpen className="h-4 w-4" aria-hidden />
            <span className="ms-1.5">נסה שוב</span>
          </Button>
          <Link
            to="/child/educate"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            חזרה ללימוד
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
