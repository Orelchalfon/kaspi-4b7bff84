import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { GoalRow, TxRow } from "@/components/savings/types";
import {
  computeGoalDeposits,
  computeSavingsBalance,
  computeWalletBalance,
} from "@/lib/transactions";

/**
 * Data for /child/savings: the child's goals, full transaction ledger (balances are
 * derived from it by `type`), the household auto-savings %, and title lookups for
 * labelling recent savings rows.
 *
 * - `reload()` shows the loading state (first load / retry after an error).
 * - `refresh()` re-fetches silently after a mutation (deposit, transfer, new goal).
 */
export function useSavingsData() {
  const { childProfileId, householdId } = useAuth();
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [goalTitles, setGoalTitles] = useState<Record<string, string>>({});
  const [savingsPct, setSavingsPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadAll = useCallback(async () => {
    if (!childProfileId || !householdId) return;
    const [gRes, tRes, sRes] = await Promise.all([
      supabase
        .from("goals")
        .select(
          "id, title, target_amount, cycle_amount, cycle_period, status, auto_deposit, auto_source, next_auto_deposit_on, last_auto_status",
        )
        .eq("child_id", childProfileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, amount, type, goal_id, reference_task_id, created_at")
        .eq("child_id", childProfileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("household_settings")
        .select("savings_percentage")
        .eq("household_id", householdId)
        .maybeSingle(),
    ]);
    if (gRes.error || tRes.error || sRes.error) {
      console.error("[child/savings] load failed", gRes.error ?? tRes.error ?? sRes.error);
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);

    const goalList = (gRes.data ?? []) as GoalRow[];
    const txList = (tRes.data ?? []) as TxRow[];
    setGoals(goalList);
    setTransactions(txList);
    setSavingsPct(sRes.data?.savings_percentage ?? 0);

    // Goal titles come straight from the goals we already fetched.
    const goalMap: Record<string, string> = {};
    goalList.forEach((g) => (goalMap[g.id] = g.title));
    setGoalTitles(goalMap);

    // Task titles only matter for savings_credit rows that came from approve_task_and_pay.
    const taskIds = Array.from(
      new Set(
        txList
          .filter((t) => t.type === "savings_credit" && t.reference_task_id)
          .map((t) => t.reference_task_id as string),
      ),
    );
    if (taskIds.length > 0) {
      const { data: titlesData } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);
      const map: Record<string, string> = {};
      (titlesData || []).forEach((t: { id: string; title: string }) => (map[t.id] = t.title));
      setTaskTitles(map);
    } else {
      setTaskTitles({});
    }
  }, [childProfileId, householdId]);

  const reload = useCallback(() => {
    if (!childProfileId || !householdId) return;
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [childProfileId, householdId, loadAll]);

  const refresh = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  useEffect(() => {
    reload();
  }, [reload]);

  const savingsBalance = useMemo(() => computeSavingsBalance(transactions), [transactions]);
  const walletBalance = useMemo(() => computeWalletBalance(transactions), [transactions]);
  const depositedByGoal = useMemo(() => computeGoalDeposits(transactions), [transactions]);
  const recentSavings = useMemo(
    () => transactions.filter((t) => t.type === "savings_credit").slice(0, 5),
    [transactions],
  );

  return {
    goals,
    taskTitles,
    goalTitles,
    savingsPct,
    loading,
    loadFailed,
    savingsBalance,
    walletBalance,
    depositedByGoal,
    recentSavings,
    reload,
    refresh,
  };
}
