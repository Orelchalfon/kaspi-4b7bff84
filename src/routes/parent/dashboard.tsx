import { CoinAmount } from "@/components/coin-amount";
import { ParentDashboardSkeleton } from "@/components/loading-skeletons";
import { StatusBadge } from "@/components/status-badge";
import { TransactionRow } from "@/components/transaction-row";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChildrenStack } from "@/components/children-stack";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, SUBJECT_LABELS_HE, isQuizSubject, type QuizSubject } from "@/lib/quiz-bank";
import { isWalletTx } from "@/lib/transactions";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Inbox,
  Loader2,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Receipt,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/dashboard")({
  component: ParentDashboard,
});

/** The dashboard shows the latest N wallet transactions; the rest live on /parent/transactions. */
const RECENT_TX_LIMIT = 20;

interface ChildRow {
  id: string;
  display_name: string;
  avatar: string | null;
}
interface TxRow {
  id: string;
  child_id: string;
  amount: number;
  reference_task_id: string | null;
  goal_id: string | null;
  created_at: string | null;
  type: string;
}
interface TaskRow {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  child_id: string;
  created_at: string | null;
}

function ParentDashboard() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<{ id: string; kind: "approve" | "reject" } | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [savingsPct, setSavingsPct] = useState<number>(0);
  const [pctInput, setPctInput] = useState<string>("0");
  const [savingPct, setSavingPct] = useState(false);
  const [pctError, setPctError] = useState("");
  const [savedSubjects, setSavedSubjects] = useState<QuizSubject[]>([]);
  const [savedReward, setSavedReward] = useState<number>(5);
  const [quizSubjects, setQuizSubjects] = useState<QuizSubject[]>([]);
  const [quizRewardInput, setQuizRewardInput] = useState<string>("5");
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

  async function loadAll(hhId: string) {
    const [{ data: cData }, { data: txData }, { data: tData }, { data: sData }] = await Promise.all(
      [
        supabase
          .from("child_profiles")
          .select("id, display_name, avatar")
          .eq("household_id", hhId)
          .order("display_name", { ascending: true }),
        supabase
          .from("transactions")
          .select("id, child_id, amount, reference_task_id, goal_id, created_at, type")
          .eq("household_id", hhId)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("id, title, reward_amount, status, child_id, created_at")
          .eq("household_id", hhId)
          .in("status", ["assigned", "submitted"])
          .order("created_at", { ascending: false }),
        supabase
          .from("household_settings")
          .select("savings_percentage, quiz_subjects, quiz_reward_amount")
          .eq("household_id", hhId)
          .maybeSingle(),
      ],
    );

    const childList = cData || [];
    const txList = (txData || []) as TxRow[];
    const taskList = (tData || []) as TaskRow[];
    setChildren(childList);
    setTransactions(txList);
    setTasks(taskList);
    const pct = sData?.savings_percentage ?? 0;
    setSavingsPct(pct);
    setPctInput(String(pct));
    const rawSubjects = (sData?.quiz_subjects ?? []) as string[];
    const validSubjects = rawSubjects.filter(isQuizSubject);
    const reward = sData?.quiz_reward_amount ?? 5;
    setSavedSubjects(validSubjects);
    setQuizSubjects(validSubjects);
    setSavedReward(reward);
    setQuizRewardInput(String(reward));

    const txTaskIds = Array.from(
      new Set(txList.map((t) => t.reference_task_id).filter((x): x is string => !!x)),
    );
    if (txTaskIds.length > 0) {
      const { data: titlesData } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", txTaskIds);
      const map: Record<string, string> = {};
      (titlesData || []).forEach((t: { id: string; title: string }) => (map[t.id] = t.title));
      setTaskTitles(map);
    } else {
      setTaskTitles({});
    }

    setSelectedChildId((prev) => prev ?? childList[0]?.id ?? null);
  }

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    loadAll(householdId).finally(() => setLoading(false));
  }, [householdId]);

  const balances = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of children) m[c.id] = 0;
    for (const tx of transactions) {
      if (!isWalletTx(tx.type)) continue;
      m[tx.child_id] = (m[tx.child_id] ?? 0) + tx.amount;
    }
    return m;
  }, [children, transactions]);

  const savingsBalances = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of children) m[c.id] = 0;
    for (const tx of transactions) {
      if (tx.type !== "savings_credit") continue;
      m[tx.child_id] = (m[tx.child_id] ?? 0) + tx.amount;
    }
    return m;
  }, [children, transactions]);

  const pendingByChild = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "submitted") {
        m[t.child_id] = (m[t.child_id] ?? 0) + 1;
      }
    }
    return m;
  }, [tasks]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const childTransactions = useMemo(
    () =>
      // Every wallet-affecting type (incl. wallet_debit transfers to savings/goals), so
      // the list reconciles with the balance shown above it.
      transactions.filter((t) => t.child_id === selectedChildId && isWalletTx(t.type)),
    [transactions, selectedChildId],
  );
  const childTasks = useMemo(
    () => tasks.filter((t) => t.child_id === selectedChildId),
    [tasks, selectedChildId],
  );

  const handleApprove = async (taskId: string) => {
    setActing({ id: taskId, kind: "approve" });
    const { error } = await supabase.rpc("approve_task_and_pay", { p_task_id: taskId });
    if (error) {
      console.error("[approve_task_and_pay]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה באישור המשימה");
    } else {
      toast.success("המשימה אושרה והמטבעות זוכו");
      if (householdId) await loadAll(householdId);
    }
    setActing(null);
  };

  const handleReject = async (taskId: string) => {
    setActing({ id: taskId, kind: "reject" });
    const { error } = await supabase
      .from("tasks")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) {
      console.error("[reject task]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בדחיית המשימה");
    } else {
      toast.success("המשימה נדחתה");
      if (householdId) await loadAll(householdId);
    }
    setActing(null);
  };

  const handleSavePct = async () => {
    if (!householdId) return;
    const n = Number(pctInput);
    if (!Number.isFinite(n) || n < 0 || n > 100 || !Number.isInteger(n)) {
      setPctError("אחוז חייב להיות מספר שלם בין 0 ל-100");
      return;
    }
    setPctError("");
    setSavingPct(true);
    const { error } = await supabase
      .from("household_settings")
      .upsert({ household_id: householdId, savings_percentage: n }, { onConflict: "household_id" });
    setSavingPct(false);
    if (error) {
      console.error("[savings_percentage]", error);
      toast.error(import.meta.env.DEV ? `שגיאה: ${error.message}` : "שגיאה בשמירה");
      return;
    }
    toast.success("אחוז החיסכון עודכן");
    setSavingsPct(n);
  };

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
    if (!householdId) return;
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

  if (loading) {
    return <ParentDashboardSkeleton />;
  }

  const txTaskTitle = (taskId: string | null) => (taskId ? taskTitles[taskId] : undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <div className="flex gap-2">
          <Button asChild size="touch">
            <Link to="/parent/children/new">
              <UserPlus aria-hidden />
              ילד חדש
            </Link>
          </Button>
          <Button asChild size="touch" variant="outline">
            <Link to="/parent/tasks/new">
              <Plus aria-hidden />
              משימה
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PiggyBank className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold">אחוז חיסכון אוטומטי</h2>
              <p className="text-xs text-muted-foreground">
                כל אישור משימה יעביר אחוז זה מהתגמול לחיסכון של הילד
                {savingsPct > 0 ? ` (כרגע ${savingsPct}%)` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="pct" className="text-xs">
                  אחוז (0-100)
                </Label>
                <Input
                  id="pct"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={pctInput}
                  onChange={(e) => {
                    setPctInput(e.target.value);
                    setPctError("");
                  }}
                  aria-invalid={!!pctError || undefined}
                  aria-describedby={pctError ? "pct-error" : undefined}
                  className="h-11 w-24 tabular-nums"
                />
              </div>
              <Button
                size="touch"
                onClick={handleSavePct}
                disabled={savingPct || pctInput === String(savingsPct)}
              >
                {savingPct && <Loader2 className="animate-spin" aria-hidden />}
                {savingPct ? "שומר..." : "שמור"}
              </Button>
            </div>
            {pctError && (
              <p id="pct-error" role="alert" className="text-xs text-destructive">
                {pctError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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

      <section aria-labelledby="children-heading">
        <h2 id="children-heading" className="mb-3 text-lg font-semibold">
          ילדים
        </h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <p>עדיין לא הוספתם ילדים.</p>
              <Button asChild variant="link" className="h-11">
                <Link to="/parent/children/new">
                  הוסיפו ילד ראשון
                  <ArrowLeft aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ChildrenStack
            childrenList={children}
            selectedChildId={selectedChildId}
            pendingByChild={pendingByChild}
            onSelect={setSelectedChildId}
          />
        )}
      </section>

      {selectedChild && (
        <section aria-labelledby="child-heading" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-y-2 border-t pt-6">
            <h2 id="child-heading" className="text-xl font-bold">
              {selectedChild.display_name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <PiggyBank className="size-4" aria-hidden />
                <span>חיסכון:</span>
                <CoinAmount value={savingsBalances[selectedChild.id] ?? 0} size="lg" animate />
              </span>
              <span className="flex items-center gap-1">
                <span>יתרה:</span>
                <CoinAmount value={balances[selectedChild.id] ?? 0} size="lg" animate />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-touch"
                  aria-label={`עדכון יתרה ידני עבור ${selectedChild.display_name}`}
                  onClick={() => setAdjustDialogOpen(true)}
                >
                  <Pencil aria-hidden />
                </Button>
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold">משימות בתור</h3>
            {childTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Inbox className="size-8 opacity-50" aria-hidden />
                  <p>אין משימות פתוחות לילד זה.</p>
                  <Button asChild variant="link" className="h-11">
                    <Link to="/parent/tasks/new">צרו משימה חדשה</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile: stacked cards (a 4-column table would scroll sideways). */}
                <ul className="flex flex-col gap-2 md:hidden">
                  {childTasks.map((t) => (
                    <li key={t.id}>
                      <Card>
                        <CardContent className="flex flex-col gap-3 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              to="/parent/tasks/$taskId"
                              params={{ taskId: t.id }}
                              className="min-w-0 rounded font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {t.title}
                            </Link>
                            <CoinAmount value={t.reward_amount} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <StatusBadge status={t.status} />
                            {t.status === "submitted" && (
                              <TaskReviewActions
                                title={t.title}
                                acting={acting?.id === t.id ? acting.kind : null}
                                onApprove={() => handleApprove(t.id)}
                                onReject={() => handleReject(t.id)}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>

                {/* Tablet and up: table. */}
                <Card className="hidden md:block">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>משימה</TableHead>
                          <TableHead>תגמול</TableHead>
                          <TableHead>סטטוס</TableHead>
                          <TableHead>פעולה</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {childTasks.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <Link
                                to="/parent/tasks/$taskId"
                                params={{ taskId: t.id }}
                                className="rounded font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {t.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <CoinAmount value={t.reward_amount} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={t.status} />
                            </TableCell>
                            <TableCell>
                              {t.status === "submitted" ? (
                                <TaskReviewActions
                                  title={t.title}
                                  acting={acting?.id === t.id ? acting.kind : null}
                                  onApprove={() => handleApprove(t.id)}
                                  onReject={() => handleReject(t.id)}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">תנועות</h3>
              {childTransactions.length > RECENT_TX_LIMIT && (
                <Button asChild variant="link" className="h-11 px-2">
                  <Link to="/parent/transactions">
                    לכל התנועות
                    <ArrowLeft aria-hidden />
                  </Link>
                </Button>
              )}
            </div>
            {childTransactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Receipt className="size-8 opacity-50" aria-hidden />
                  <p>אין תנועות עדיין.</p>
                </CardContent>
              </Card>
            ) : (
              <ul className="flex flex-col gap-2">
                {childTransactions.slice(0, RECENT_TX_LIMIT).map((tx) => (
                  <li key={tx.id}>
                    <TransactionRow tx={tx} taskTitle={txTaskTitle(tx.reference_task_id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <ManualAdjustmentDialog
        child={selectedChild}
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        onSaved={() => (householdId ? loadAll(householdId) : Promise.resolve())}
      />
    </div>
  );
}

function TaskReviewActions({
  title,
  acting,
  onApprove,
  onReject,
}: {
  title: string;
  /** Which action is in flight for this task, if any. */
  acting: "approve" | "reject" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const busy = acting !== null;
  return (
    <div className="flex gap-2">
      <Button
        size="touch"
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={onApprove}
        disabled={busy}
        aria-label={`אשר את ${title}`}
      >
        {acting === "approve" ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Check aria-hidden />
        )}
        אשר
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="touch" variant="destructive" disabled={busy} aria-label={`דחה את ${title}`}>
            {acting === "reject" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <X aria-hidden />
            )}
            דחה
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לדחות את המשימה?</AlertDialogTitle>
            <AlertDialogDescription>
              המשימה &quot;{title}&quot; תסומן כנדחתה והילד לא יזוכה במטבעות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={onReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              דחה משימה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ManualAdjustmentDialog({
  child,
  open,
  onOpenChange,
  onSaved,
}: {
  child: { id: string; display_name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amountInput, setAmountInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDirection("add");
      setAmountInput("");
      setError("");
      setConfirmOpen(false);
    }
  }, [open]);

  const parsedAmount = (): number | null => {
    const n = Number(amountInput);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
  };

  const performAdjustment = async (n: number) => {
    if (!child) return;
    setSubmitting(true);
    const signedAmount = direction === "add" ? n : -n;
    const { data, error: rpcError } = await supabase.rpc("manual_adjustment", {
      _child_id: child.id,
      _amount: signedAmount,
    });
    setSubmitting(false);

    const payload = data as { success?: boolean; error?: string } | null;
    if (rpcError || payload?.error) {
      console.error("[manual_adjustment]", rpcError ?? payload?.error);
      setError(
        payload?.error === "Adjustment would make wallet negative"
          ? "הפעולה תגרום ליתרה שלילית. בחרו סכום קטן יותר."
          : "לא ניתן לבצע את הפעולה. נסו שוב.",
      );
      return;
    }

    toast.success("היתרה עודכנה");
    onOpenChange(false);
    await onSaved();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!child || submitting) return;
    const n = parsedAmount();
    if (n === null) {
      setError("סכום חייב להיות מספר שלם חיובי");
      return;
    }
    setError("");
    // Taking coins away from a child is the destructive direction: confirm first.
    if (direction === "subtract") {
      setConfirmOpen(true);
      return;
    }
    await performAdjustment(n);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עדכון יתרה — {child?.display_name}</DialogTitle>
          <DialogDescription>הוסיפו או הפחיתו מטבעות מהארנק של הילד באופן ידני.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ToggleGroup
            type="single"
            value={direction}
            onValueChange={(v) => {
              // Radix emits "" when the active item is clicked again; keep a selection.
              if (v === "add" || v === "subtract") setDirection(v);
            }}
            variant="outline"
            aria-label="סוג העדכון"
            className="grid grid-cols-2"
          >
            <ToggleGroupItem
              value="add"
              className="h-11 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              <Plus aria-hidden />
              הוסף
            </ToggleGroupItem>
            <ToggleGroupItem
              value="subtract"
              className="h-11 data-[state=on]:border-destructive data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive"
            >
              <Minus aria-hidden />
              הפחת
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-amount">סכום</Label>
            <Input
              id="adjust-amount"
              type="number"
              inputMode="numeric"
              min={1}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setError("");
              }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "adjust-error" : undefined}
              className="h-11 tabular-nums"
              dir="ltr"
              autoFocus
            />
          </div>
          {error && (
            <Alert variant="destructive" id="adjust-error" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="submit"
              size="touch"
              variant={direction === "subtract" ? "destructive" : "default"}
              className="w-full"
              disabled={submitting}
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "מעדכן..." : direction === "subtract" ? "הפחתת מטבעות" : "הוספת מטבעות"}
            </Button>
          </DialogFooter>
        </form>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                להפחית {parsedAmount() ?? 0} מטבעות מ{child?.display_name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                המטבעות יירדו מהארנק של הילד ויופיעו אצלו כהתאמה ידנית.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const n = parsedAmount();
                  if (n !== null) void performAdjustment(n);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                הפחת
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
