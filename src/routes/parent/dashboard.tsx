import { CoinAmount } from "@/components/coin-amount";
import { DashboardSkeleton } from "@/components/loading-skeletons";
import { StatusBadge } from "@/components/status-badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, SUBJECT_LABELS_HE, isQuizSubject, type QuizSubject } from "@/lib/quiz-bank";
import { isWalletTx } from "@/lib/transactions";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, Inbox, PiggyBank, Plus, Receipt, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/dashboard")({
  component: ParentDashboard,
});

interface ChildRow {
  id: string;
  display_name: string;
}
interface TxRow {
  id: string;
  child_id: string;
  amount: number;
  reference_task_id: string | null;
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
  const [acting, setActing] = useState<string | null>(null);
  const [savingsPct, setSavingsPct] = useState<number>(0);
  const [pctInput, setPctInput] = useState<string>("0");
  const [savingPct, setSavingPct] = useState(false);
  const [savedSubjects, setSavedSubjects] = useState<QuizSubject[]>([]);
  const [savedReward, setSavedReward] = useState<number>(5);
  const [quizSubjects, setQuizSubjects] = useState<QuizSubject[]>([]);
  const [quizRewardInput, setQuizRewardInput] = useState<string>("5");
  const [savingQuiz, setSavingQuiz] = useState(false);

  async function loadAll(hhId: string) {
    const [{ data: cData }, { data: txData }, { data: tData }, { data: sData }] = await Promise.all(
      [
        supabase
          .from("child_profiles")
          .select("id, display_name")
          .eq("household_id", hhId)
          .order("display_name", { ascending: true }),
        supabase
          .from("transactions")
          .select("id, child_id, amount, reference_task_id, created_at, type")
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
      transactions.filter(
        (t) =>
          t.child_id === selectedChildId &&
          (t.type === "task_reward" || t.type === "manual_adjustment" || t.type === "quiz_reward"),
      ),
    [transactions, selectedChildId],
  );
  const childTasks = useMemo(
    () => tasks.filter((t) => t.child_id === selectedChildId),
    [tasks, selectedChildId],
  );

  const handleApprove = async (taskId: string) => {
    setActing(taskId);
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
    setActing(taskId);
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
      toast.error("אחוז חייב להיות מספר שלם בין 0 ל-100");
      return;
    }
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
      toast.error("תגמול חייב להיות מספר שלם בין 0 ל-1000");
      return;
    }
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
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <div className="flex gap-2">
          <Link to="/parent/children/new">
            <Button size="sm" className="min-h-10">
              <UserPlus className="h-4 w-4" aria-hidden />
              <span className="ms-1.5">ילד חדש</span>
            </Button>
          </Link>
          <Link to="/parent/tasks/new">
            <Button size="sm" variant="outline" className="min-h-10">
              <Plus className="h-4 w-4" aria-hidden />
              <span className="ms-1.5">משימה</span>
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PiggyBank className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">אחוז חיסכון אוטומטי</p>
              <p className="text-xs text-muted-foreground">
                כל אישור משימה יעביר אחוז זה מהתגמול לחיסכון של הילד
                {savingsPct > 0 ? ` (כרגע ${savingsPct}%)` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
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
                onChange={(e) => setPctInput(e.target.value)}
                className="w-24 tabular-nums"
              />
            </div>
            <Button
              size="sm"
              className="min-h-10"
              onClick={handleSavePct}
              disabled={savingPct || pctInput === String(savingsPct)}
            >
              {savingPct ? "שומר..." : "שמור"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-semibold">לימוד וחידונים</p>
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
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {SUBJECTS.map((s) => {
                  const checked = quizSubjects.includes(s);
                  return (
                    <label
                      key={s}
                      className="flex cursor-pointer items-center gap-2 text-sm select-none"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSubject(s)}
                        aria-label={SUBJECT_LABELS_HE[s]}
                      />
                      <span className="text-foreground">{SUBJECT_LABELS_HE[s]}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
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
                    onChange={(e) => setQuizRewardInput(e.target.value)}
                    className="w-24 tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">מטבעות</span>
                </div>
              </div>
              <Button
                size="sm"
                className="min-h-10"
                onClick={handleSaveQuiz}
                disabled={savingQuiz || !quizDirty}
              >
                {savingQuiz ? "שומר..." : "שמור"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-label="ילדים">
        <h2 className="mb-3 text-lg font-semibold">ילדים</h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>עדיין לא הוספתם ילדים.</p>
              <Link to="/parent/children/new">
                <Button variant="link" className="mt-2">
                  הוסיפו ילד ראשון →
                </Button>
              </Link>
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
        <section aria-label={`פרטי ${selectedChild.display_name}`} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-y-2 border-t pt-6">
            <h2 className="text-xl font-bold">{selectedChild.display_name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2" aria-label="חיסכון">
                <PiggyBank className="h-4 w-4" aria-hidden />
                <span>חיסכון:</span>
                <CoinAmount value={savingsBalances[selectedChild.id] ?? 0} size="lg" animate />
              </span>
              <span className="flex items-center gap-2">
                <span>יתרה:</span>
                <CoinAmount value={balances[selectedChild.id] ?? 0} size="lg" animate />
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold">משימות בתור</h3>
            {childTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-50" aria-hidden />
                  <p>אין משימות פתוחות לילד זה.</p>
                  <Link to="/parent/tasks/new">
                    <Button variant="link">צרו משימה חדשה</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">משימה</TableHead>
                        <TableHead className="text-start">תגמול</TableHead>
                        <TableHead className="text-start">סטטוס</TableHead>
                        <TableHead className="text-start">פעולה</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childTasks.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <Link
                              to="/parent/tasks/$taskId"
                              params={{ taskId: t.id }}
                              className="font-medium text-foreground hover:underline"
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
                              <div className="flex gap-1.5">
                                <Button
                                  size="sm"
                                  className="min-h-9 bg-success text-success-foreground hover:bg-success/90"
                                  onClick={() => handleApprove(t.id)}
                                  disabled={acting === t.id}
                                  aria-label={`אשר את ${t.title}`}
                                >
                                  <Check className="h-4 w-4" aria-hidden />
                                  <span className="ms-1 hidden sm:inline">אשר</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="min-h-9"
                                      disabled={acting === t.id}
                                      aria-label={`דחה את ${t.title}`}
                                    >
                                      <X className="h-4 w-4" aria-hidden />
                                      <span className="ms-1 hidden sm:inline">דחה</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent dir="rtl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>לדחות את המשימה?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        פעולה זו לא תזכה את הילד במטבעות.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleReject(t.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        דחה משימה
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
            )}
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold">תנועות</h3>
            {childTransactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 opacity-50" aria-hidden />
                  <p>אין תנועות עדיין.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">תאריך</TableHead>
                        <TableHead className="text-start">משימה</TableHead>
                        <TableHead className="text-start">סכום</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleDateString("he-IL")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {tx.reference_task_id
                              ? (taskTitles[tx.reference_task_id] ?? "משימה")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <CoinAmount value={tx.amount} signed tone="success" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

interface ChildrenStackProps {
  childrenList: ChildRow[];
  selectedChildId: string | null;
  pendingByChild: Record<string, number>;
  onSelect: (id: string) => void;
}

// Inline stack of child-avatar buttons. Active sits at the start edge (right in
// RTL); inactive children peek out behind toward the end. Desktop: hover opens
// the fan. Mobile: tap the top avatar to toggle. Selecting a non-active avatar
// fires onSelect and collapses.
function ChildrenStack({
  childrenList,
  selectedChildId,
  pendingByChild,
  onSelect,
}: ChildrenStackProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isExpanded]);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) ?? childrenList[0] ?? null;
  const ordered = activeChild
    ? [activeChild, ...childrenList.filter((c) => c.id !== activeChild.id)]
    : childrenList;

  const n = ordered.length;
  const expandedWidth = 48 + Math.max(0, n - 1) * 64;
  const activePending = activeChild ? (pendingByChild[activeChild.id] ?? 0) : 0;

  function handleAvatarClick(child: ChildRow, isActive: boolean) {
    if (isActive) {
      setIsExpanded((prev) => !prev);
      return;
    }
    onSelect(child.id);
    setIsExpanded(false);
  }

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <div
        role="group"
        aria-label="ילדים"
        ref={wrapperRef}
        onMouseEnter={isMobile ? undefined : () => setIsExpanded(true)}
        onMouseLeave={isMobile ? undefined : () => setIsExpanded(false)}
        className="relative h-20 overflow-visible"
        style={{ width: `${expandedWidth}px`, maxWidth: "100%" }}
      >
        {ordered.map((child, i) => {
          const isActive = i === 0;
          const pending = pendingByChild[child.id] ?? 0;

          let transform = "translateX(0) scale(1)";
          let opacity = 1;
          if (!isExpanded && !isActive) {
            const scale = Math.max(0.85, 1 - i * 0.06);
            transform = `translateX(${i * -24}px) scale(${scale})`;
            opacity = 0.8;
          } else if (isExpanded && !isActive) {
            transform = `translateX(${i * -64}px) scale(1)`;
          }

          return (
            <Tooltip key={child.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleAvatarClick(child, isActive)}
                  aria-pressed={isActive}
                  aria-expanded={isActive ? isExpanded : undefined}
                  aria-label={`בחר את ${child.display_name}`}
                  className={cn(
                    "absolute start-0 top-2 rounded-full transition-[transform,opacity] duration-300 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "motion-reduce:transition-none",
                  )}
                  style={{
                    transform,
                    opacity,
                    zIndex: n - i,
                    transitionDelay: `${i * 40}ms`,
                  }}
                >
                  <span className="relative inline-flex">
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold",
                        isActive
                          ? "border-2 border-solid border-purple-300 bg-primary text-primary-foreground shadow-none"
                          : "bg-primary/10 text-primary",
                      )}
                      aria-hidden
                    >
                      {child.display_name.charAt(0)}
                    </span>
                    {pending > 0 && (
                      <span
                        className="absolute -top-1 -start-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[11px] font-bold tabular-nums text-warning-foreground shadow-sm"
                        aria-hidden
                      >
                        {pending}
                      </span>
                    )}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={10}
                className={cn(
                  "border-2 border-foreground/25 bg-popover px-3 py-1.5 text-sm font-semibold text-popover-foreground shadow-lg",
                  "data-[state=delayed-open]:zoom-in-90 data-[state=closed]:zoom-out-90",
                  "data-[state=delayed-open]:duration-200",
                )}
              >
                {child.display_name}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {activePending > 0 && (
          <span
            className={cn(
              "pointer-events-none absolute start-0 top-[60px] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-bold tabular-nums text-warning-foreground transition-opacity duration-300 ease-out",
              "motion-reduce:transition-none",
              isExpanded ? "opacity-100" : "opacity-0",
            )}
            aria-label={`${activePending} משימות ממתינות לאישור`}
          >
            {activePending} ממתינות
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
