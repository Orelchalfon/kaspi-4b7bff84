import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Coins,
  Loader2,
  PiggyBank,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BAND_LABELS_HE,
  QUIZ_LENGTH,
  QUIZ_PASS_THRESHOLD_PCT,
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

  // Moving between questions announces the new question: focus its heading (but not on
  // the very first render, so the page doesn't jump on load).
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);
  useEffect(() => {
    if (!movedRef.current) return;
    questionHeadingRef.current?.focus({ preventScroll: true });
  }, [currentIdx]);

  const goNext = () => {
    if (!hasPicked) return;
    movedRef.current = true;
    setCurrentIdx((i) => i + 1);
  };

  // Answers are kept per question, so going back shows (and lets the child change)
  // what they picked before.
  const goPrev = () => {
    if (currentIdx === 0) return;
    movedRef.current = true;
    setCurrentIdx((i) => i - 1);
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
    movedRef.current = false;
    setResult(null);
    setPhase("quiz");
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <OrbitalLoader message="טוען חידון..." />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="החידון לא זמין" back={{ to: "/child/educate", label: "חזרה ללימוד" }} />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-base text-foreground">הנושא הזה לא פעיל כרגע.</p>
            <p className="mt-1 text-sm text-muted-foreground">בקשו מההורה להפעיל אותו.</p>
            <Button asChild variant="outline" size="touch" className="mt-5">
              <Link to="/child/educate">חזרה ללימוד</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <ResultScreen
        result={result}
        subjectLabel={subjectLabel}
        total={questions.length}
        onRetry={retry}
      />
    );
  }

  const answered = picked.filter((p) => p !== null).length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">חידון ב{subjectLabel}</h1>
      <header className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="touch" className="-ms-3 text-muted-foreground">
          <Link to="/child/educate">
            {/* In RTL "back" points right. */}
            <ArrowRight aria-hidden />
            חזרה
          </Link>
        </Button>
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{subjectLabel}</div>
          <div className="text-xs text-muted-foreground">{BAND_LABELS_HE[band]}</div>
        </div>
        <span className="text-sm font-medium tabular-nums text-muted-foreground" aria-hidden>
          {currentIdx + 1} / {questions.length}
        </span>
      </header>

      {/* Fills from the inline start (right) via origin-right — RTL-safe, unlike ui/progress. */}
      <div
        role="progressbar"
        aria-label="התקדמות בחידון"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={answered}
        aria-valuetext={`ענית על ${answered} מתוך ${questions.length} שאלות`}
        className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]"
      >
        <div
          className="h-full w-full origin-right rounded-full bg-primary transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${answered / questions.length})` }}
        />
      </div>

      {currentQuestion && (
        <Card>
          <CardContent className="flex flex-col gap-5 py-6">
            <h2
              ref={questionHeadingRef}
              tabIndex={-1}
              id="quiz-question"
              className="text-xl leading-snug font-semibold text-foreground outline-none md:text-2xl"
            >
              <span className="sr-only">
                שאלה {currentIdx + 1} מתוך {questions.length}:{" "}
              </span>
              {currentQuestion.prompt}
            </h2>
            <div role="group" aria-labelledby="quiz-question" className="grid grid-cols-1 gap-2.5">
              {currentQuestion.choices.map((choice, idx) => {
                const isPicked = picked[currentIdx] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectChoice(idx)}
                    disabled={phase === "submitting"}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-base",
                      isPicked
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "border-border bg-card text-foreground hover:bg-accent",
                    )}
                    aria-pressed={isPicked}
                  >
                    {/* Selection is shown by the check mark too, not by color alone. */}
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isPicked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isPicked && <Check className="size-3.5" />}
                    </span>
                    {choice}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RTL: "previous" sits at the start (right) and points right; "next" points left. */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="touch"
          onClick={goPrev}
          disabled={currentIdx === 0 || phase === "submitting"}
          className={cn(currentIdx === 0 && "invisible")}
        >
          <ArrowRight aria-hidden />
          הקודם
        </Button>
        {isLast ? (
          <Button size="touch" onClick={submit} disabled={!hasPicked || phase !== "quiz"}>
            {phase === "submitting" ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                שולח...
              </>
            ) : (
              <>
                <Check aria-hidden />
                סיים
              </>
            )}
          </Button>
        ) : (
          <Button size="touch" onClick={goNext} disabled={!hasPicked}>
            הבא
            <ArrowLeft aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}

function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

function ResultScreen({
  result,
  subjectLabel,
  total,
  onRetry,
}: {
  result: Result;
  subjectLabel: string;
  total: number;
  onRetry: () => void;
}) {
  // Move focus to the result heading so screen readers announce the outcome.
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const headingClass = "text-2xl font-bold text-foreground outline-none";

  if (result.passed && result.paid) {
    return (
      <Card role="status">
        <CardContent className="flex flex-col gap-4 py-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-8" aria-hidden />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
            כל הכבוד!
          </h1>
          <p className="text-sm text-muted-foreground">עברת את החידון ב{subjectLabel}.</p>
          <dl className="mx-auto flex w-full max-w-sm flex-col gap-2 rounded-xl border border-foreground/5 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="size-4 text-coin" aria-hidden />
                לארנק
              </dt>
              <dd className="text-lg font-bold tabular-nums text-foreground">
                +{result.wallet_delta}
              </dd>
            </div>
            {result.savings_delta > 0 && (
              <div className="flex items-center justify-between border-t border-foreground/5 pt-2">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PiggyBank className="size-4 text-primary" aria-hidden />
                  לחיסכון
                </dt>
                <dd className="text-lg font-bold tabular-nums text-primary">
                  +{result.savings_delta}
                </dd>
              </div>
            )}
          </dl>
          <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button asChild size="touch">
              <Link to="/child/educate">חזרה ללימוד</Link>
            </Button>
            <Button asChild variant="ghost" size="touch" className="text-muted-foreground">
              <Link to="/child/wallet">
                <Wallet aria-hidden />
                לארנק שלי
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.passed && !result.paid) {
    return (
      <Card role="status">
        <CardContent className="flex flex-col gap-4 py-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="size-8" aria-hidden />
          </div>
          <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
            כל הכבוד!
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            עברת את החידון ב{subjectLabel}. היום כבר נצבר תגמול בנושא הזה — אפשר לנסות שוב מחר.
          </p>
          <Button asChild size="touch" className="self-center">
            <Link to="/child/educate">חזרה ללימוד</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // did_not_pass — the pass mark comes from the same 80% rule the RPC enforces.
  const passMark = Math.ceil((QUIZ_PASS_THRESHOLD_PCT / 100) * total);
  return (
    <Card role="status">
      <CardContent className="flex flex-col gap-4 py-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="size-8" aria-hidden />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
          כמעט שם
        </h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          ענית נכון על {result.correct} מתוך {total}. צריך לפחות {passMark} כדי לעבור — בוא ננסה
          שוב.
        </p>
        <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="touch" onClick={onRetry}>
            <BookOpen aria-hidden />
            נסה שוב
          </Button>
          <Button asChild variant="ghost" size="touch" className="text-muted-foreground">
            <Link to="/child/educate">חזרה ללימוד</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
