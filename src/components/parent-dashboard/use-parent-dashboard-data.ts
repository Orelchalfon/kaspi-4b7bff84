import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isQuizSubject } from "@/lib/quiz-bank";
import { isWalletTx } from "@/lib/transactions";
import type { TaskAction } from "@/components/parent-dashboard/pending-tasks";
import type {
  ChildRow,
  DashboardSettings,
  TaskRow,
  TxRow,
} from "@/components/parent-dashboard/types";

/**
 * Data + task review for /parent/dashboard.
 *
 * Loads the household's children, full transaction ledger (balances are derived from
 * it by `type`), open tasks and settings; tracks the selected child; and owns the
 * approve (approve_task_and_pay RPC) / reject flows, which reload everything on success.
 * `settingsVersion` bumps on every load so the page can re-key the settings cards.
 * A failed load sets `loadFailed` (the page shows a retry) instead of empty data.
 */
export function useParentDashboardData() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [acting, setActing] = useState<TaskAction>(null);
  const [settings, setSettings] = useState<DashboardSettings>({
    savingsPct: 0,
    quizSubjects: [],
    quizReward: 5,
  });
  const [settingsVersion, setSettingsVersion] = useState(0);

  const loadAll = useCallback(async () => {
    if (!householdId) return;
    const hhId = householdId;
    const [cRes, txRes, tRes, sRes] = await Promise.all([
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
    ]);
    if (cRes.error || txRes.error || tRes.error || sRes.error) {
      console.error(
        "[parent/dashboard] load failed",
        cRes.error ?? txRes.error ?? tRes.error ?? sRes.error,
      );
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);

    const sData = sRes.data;
    const childList = cRes.data || [];
    const txList = (txRes.data || []) as TxRow[];
    const taskList = (tRes.data || []) as TaskRow[];
    setChildren(childList);
    setTransactions(txList);
    setTasks(taskList);
    setSettings({
      savingsPct: sData?.savings_percentage ?? 0,
      quizSubjects: ((sData?.quiz_subjects ?? []) as string[]).filter(isQuizSubject),
      quizReward: sData?.quiz_reward_amount ?? 5,
    });
    // Re-key the settings cards so their inputs reset to the saved values, as before.
    setSettingsVersion((v) => v + 1);

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
  }, [householdId]);

  const reload = useCallback(() => {
    if (!householdId) return;
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [householdId, loadAll]);

  useEffect(() => {
    reload();
  }, [reload]);

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
      await loadAll();
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
      await loadAll();
    }
    setActing(null);
  };

  return {
    householdId,
    children,
    taskTitles,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    loading,
    loadFailed,
    acting,
    settings,
    settingsVersion,
    balances,
    savingsBalances,
    pendingByChild,
    childTransactions,
    childTasks,
    handleApprove,
    handleReject,
    /** Full reload with the loading state (first load / retry after an error). */
    reload,
    /** Silent reload after a mutation elsewhere on the page (e.g. manual adjustment). */
    refresh: loadAll,
  };
}
