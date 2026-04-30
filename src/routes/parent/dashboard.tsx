import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Plus, UserPlus, Inbox, Receipt, Check, X } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
import { DashboardSkeleton } from "@/components/loading-skeletons";
import { cn } from "@/lib/utils";
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
  child_profile_id: string;
  amount: number;
  task_id: string | null;
  created_at: string;
}
interface TaskRow {
  id: string;
  title: string;
  reward_amount: number;
  status: string;
  child_profile_id: string;
  created_at: string;
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

  async function loadAll(hhId: string) {
    const [{ data: cData }, { data: txData }, { data: tData }] = await Promise.all([
      supabase
        .from("child_profiles")
        .select("id, display_name")
        .eq("household_id", hhId)
        .order("display_name", { ascending: true }),
      supabase
        .from("transactions")
        .select("id, child_profile_id, amount, task_id, created_at")
        .eq("household_id", hhId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("id, title, reward_amount, status, child_profile_id, created_at")
        .eq("household_id", hhId)
        .in("status", ["assigned", "submitted"])
        .order("created_at", { ascending: false }),
    ]);

    const childList = cData || [];
    const txList = (txData || []) as TxRow[];
    const taskList = (tData || []) as TaskRow[];
    setChildren(childList);
    setTransactions(txList);
    setTasks(taskList);

    // Fetch titles for tasks referenced by transactions (for the tx table label)
    const txTaskIds = Array.from(new Set(txList.map((t) => t.task_id).filter((x): x is string => !!x)));
    if (txTaskIds.length > 0) {
      const { data: titlesData } = await supabase.from("tasks").select("id, title").in("id", txTaskIds);
      const map: Record<string, string> = {};
      (titlesData || []).forEach((t: any) => (map[t.id] = t.title));
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
      m[tx.child_profile_id] = (m[tx.child_profile_id] ?? 0) + tx.amount;
    }
    return m;
  }, [children, transactions]);

  const pendingByChild = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "submitted") {
        m[t.child_profile_id] = (m[t.child_profile_id] ?? 0) + 1;
      }
    }
    return m;
  }, [tasks]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const childTransactions = useMemo(
    () => transactions.filter((t) => t.child_profile_id === selectedChildId),
    [transactions, selectedChildId],
  );
  const childTasks = useMemo(
    () => tasks.filter((t) => t.child_profile_id === selectedChildId),
    [tasks, selectedChildId],
  );

  const handleApprove = async (taskId: string) => {
    setActing(taskId);
    const { data, error } = await supabase.rpc("approve_task", { _task_id: taskId });
    if (error) {
      toast.error("שגיאה באישור המשימה");
    } else if ((data as any)?.error) {
      toast.error((data as any).error);
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
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) {
      toast.error("שגיאה בדחיית המשימה");
    } else {
      toast.success("המשימה נדחתה");
      if (householdId) await loadAll(householdId);
    }
    setActing(null);
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

      {/* Children selector */}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => {
              const isActive = child.id === selectedChildId;
              const pending = pendingByChild[child.id] ?? 0;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-xl border bg-card text-start transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "border-primary bg-accent ring-2 ring-primary" : "hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                          isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                        aria-hidden
                      >
                        {child.display_name.charAt(0)}
                      </span>
                      <div>
                        {pending > 0 && (
                          <span
                            className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-bold tabular-nums text-warning-foreground"
                            aria-label={`${pending} משימות ממתינות לאישור`}
                          >
                            {pending} ממתינות
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected child details */}
      {selectedChild && (
        <section aria-label={`פרטי ${selectedChild.display_name}`} className="space-y-6">
          <div className="flex items-center justify-between border-t pt-6">
            <h2 className="text-xl font-bold">{selectedChild.display_name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>יתרה:</span>
              <CoinAmount value={balances[selectedChild.id] ?? 0} size="lg" />
            </div>
          </div>

          {/* Tasks queue */}
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
                                      <AlertDialogDescription>פעולה זו לא תזכה את הילד במטבעות.</AlertDialogDescription>
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

          {/* Transactions */}
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
                            {new Date(tx.created_at).toLocaleDateString("he-IL")}
                          </TableCell>
                          <TableCell>{tx.task_id ? (taskTitles[tx.task_id] ?? "משימה") : "—"}</TableCell>
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
