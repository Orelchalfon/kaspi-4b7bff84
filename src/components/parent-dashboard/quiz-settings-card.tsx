import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECTS, SUBJECT_LABELS_HE, type QuizSubject } from "@/lib/quiz-bank";

interface QuizSettingsCardProps {
  householdId: string;
  /** Saved values from the last load. The page re-keys this card on every reload, so the
   *  form resets to the saved values exactly as before the split. */
  initialSubjects: QuizSubject[];
  initialReward: number;
}

/** "לימוד וחידונים" card: edits household_settings.quiz_subjects + quiz_reward_amount. */
export function QuizSettingsCard({
  householdId,
  initialSubjects,
  initialReward,
}: QuizSettingsCardProps) {
  const [savedSubjects, setSavedSubjects] = useState<QuizSubject[]>(initialSubjects);
  const [savedReward, setSavedReward] = useState<number>(initialReward);
  const [quizSubjects, setQuizSubjects] = useState<QuizSubject[]>(initialSubjects);
  const [quizRewardInput, setQuizRewardInput] = useState<string>(String(initialReward));
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

  const toggleSubject = (s: QuizSubject) => {
    setQuizSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const quizDirty = useMemo(() => {
    if (Number(quizRewardInput) !== savedReward) return true;
    if (quizSubjects.length !== savedSubjects.length) return true;
    const a = [...quizSubjects].sort();
    const b = [...savedSubjects].sort();
    return a.some((s, i) => s !== b[i]);
  }, [quizSubjects, savedSubjects, quizRewardInput, savedReward]);

  const handleSaveQuiz = async () => {
    const n = Number(quizRewardInput);
    if (!Number.isFinite(n) || n < 0 || n > 1000 || !Number.isInteger(n)) {
      setQuizError("תגמול חייב להיות מספר שלם בין 0 ל-1000");
      return;
    }
    setQuizError("");
    setSavingQuiz(true);
    const { error } = await supabase
      .from("household_settings")
      .upsert(
        { household_id: householdId, quiz_subjects: quizSubjects, quiz_reward_amount: n },
        { onConflict: "household_id" },
      );
    setSavingQuiz(false);
    if (error) {
      console.error("[quiz_settings]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בשמירה");
      return;
    }
    toast.success("הגדרות הלימוד נשמרו");
    setSavedSubjects([...quizSubjects]);
    setSavedReward(n);
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">לימוד וחידונים</h2>
            <p className="text-xs text-muted-foreground">
              בחרו נושאים והגדירו תגמול לחידון שעבר בהצלחה. הילד יוכל לזכות בתגמול פעם ביום לכל
              נושא. אחוז החיסכון של המשפחה יחול גם על תגמולי חידון.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium text-muted-foreground">
              נושאים פעילים
            </legend>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {SUBJECTS.map((s) => (
                <label
                  key={s}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm select-none hover:bg-accent"
                >
                  <Checkbox
                    checked={quizSubjects.includes(s)}
                    onCheckedChange={() => toggleSubject(s)}
                  />
                  <span className="text-foreground">{SUBJECT_LABELS_HE[s]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="quiz-reward" className="text-xs">
                  תגמול לחידון שעבר
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quiz-reward"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000}
                    value={quizRewardInput}
                    onChange={(e) => {
                      setQuizRewardInput(e.target.value);
                      setQuizError("");
                    }}
                    aria-invalid={!!quizError || undefined}
                    aria-describedby={quizError ? "quiz-reward-error" : undefined}
                    className="h-11 w-24 tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">מטבעות</span>
                </div>
              </div>
              <Button size="touch" onClick={handleSaveQuiz} disabled={savingQuiz || !quizDirty}>
                {savingQuiz && <Loader2 className="animate-spin" aria-hidden />}
                {savingQuiz ? "שומר..." : "שמור"}
              </Button>
            </div>
            {quizError && (
              <p id="quiz-reward-error" role="alert" className="text-xs text-destructive">
                {quizError}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
