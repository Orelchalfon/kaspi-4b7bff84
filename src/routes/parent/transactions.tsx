import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, Receipt, RotateCw } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { ListSkeleton } from "@/components/loading-skeletons";
import { ChildAvatar } from "@/components/child-avatar";
import { TransactionRow } from "@/components/transaction-row";
import { MonthlySummary } from "@/components/monthly-summary";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";

export const Route = createFileRoute("/parent/transactions")({
  component: ParentTransactions,
});

const PAGE_SIZE = 50;
const ALL = "all";

interface ChildRow {
  id: string;
  display_name: string;
  avatar: string | null;
  current_balance: number | null;
}

interface TxRow {
  id: string;
  child_id: string;
  amount: number;
  type: string;
  reference_task_id: string | null;
  goal_id: string | null;
  created_at: string | null;
}

function ParentTransactions() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [goalTitles, setGoalTitles] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>(ALL);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Guards against a slow response for an old filter overwriting a newer one.
  const requestId = useRef(0);

  // Resolve titles for the task/goal ids on a page so describeTx can label rows.
  const fetchTitles = useCallback(async (rows: TxRow[]) => {
    const taskIds = [...new Set(rows.map((r) => r.reference_task_id).filter(Boolean))] as string[];
    const goalIds = [...new Set(rows.map((r) => r.goal_id).filter(Boolean))] as string[];
    const [tasksRes, goalsRes] = await Promise.all([
      taskIds.length
        ? supabase.from("tasks").select("id, title").in("id", taskIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      goalIds.length
        ? supabase.from("goals").select("id, title").in("id", goalIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
    setTaskTitles((m) => ({
      ...m,
      ...Object.fromEntries((tasksRes.data ?? []).map((t) => [t.id, t.title])),
    }));
    setGoalTitles((m) => ({
      ...m,
      ...Object.fromEntries((goalsRes.data ?? []).map((g) => [g.id, g.title])),
    }));
  }, []);

  // Fetches one page (PAGE_SIZE + 1 rows to learn whether another page exists).
  const fetchPage = useCallback(
    async (offset: number, childFilter: string) => {
      let query = supabase
        .from("transactions")
        .select("id, child_id, amount, type, reference_task_id, goal_id, created_at")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE);
      if (childFilter !== ALL) query = query.eq("child_id", childFilter);
      return query;
    },
    [householdId],
  );

  const loadFirstPage = useCallback(
    async (childFilter: string) => {
      if (!householdId) return;
      const id = ++requestId.current;
      setLoading(true);
      setLoadFailed(false);
      const [childrenRes, txRes] = await Promise.all([
        supabase
          .from("child_profiles")
          .select("id, display_name, avatar, current_balance")
          .eq("household_id", householdId)
          .order("display_name", { ascending: true }),
        fetchPage(0, childFilter),
      ]);
      if (id !== requestId.current) return;
      if (childrenRes.error || txRes.error) {
        console.error("[parent/transactions] load failed", childrenRes.error ?? txRes.error);
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      const rows = (txRes.data ?? []) as TxRow[];
      setChildren((childrenRes.data ?? []) as ChildRow[]);
      setTransactions(rows.slice(0, PAGE_SIZE));
      setHasMore(rows.length > PAGE_SIZE);
      await fetchTitles(rows);
      if (id !== requestId.current) return;
      setLoading(false);
    },
    [householdId, fetchPage, fetchTitles],
  );

  useEffect(() => {
    void loadFirstPage(filter);
  }, [loadFirstPage, filter]);

  const loadMore = async () => {
    const id = requestId.current;
    setLoadingMore(true);
    const { data, error } = await fetchPage(transactions.length, filter);
    setLoadingMore(false);
    if (id !== requestId.current) return;
    if (error) {
      console.error("[parent/transactions] load more failed", error);
      setLoadFailed(true);
      return;
    }
    const rows = (data ?? []) as TxRow[];
    setTransactions((prev) => [...prev, ...rows.slice(0, PAGE_SIZE)]);
    setHasMore(rows.length > PAGE_SIZE);
    await fetchTitles(rows);
  };

  const childById = Object.fromEntries(children.map((c) => [c.id, c]));
  // Wallet totals come from the cached balance the money RPCs keep in sync, so they
  // stay correct even though only one page of transactions is loaded.
  const visibleChildren = filter === ALL ? children : children.filter((c) => c.id === filter);
  const grandTotal = visibleChildren.reduce((sum, c) => sum + Number(c.current_balance ?? 0), 0);
  const toneFor = (n: number) => (n > 0 ? "success" : n < 0 ? "destructive" : "muted");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">תנועות</h1>

      {children.length > 1 && (
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => {
            // Radix emits "" when the active item is clicked again; keep a selection.
            if (v) setFilter(v);
          }}
          variant="outline"
          aria-label="סינון לפי ילד"
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem
            value={ALL}
            className="h-11 px-4 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          >
            כל הילדים
          </ToggleGroupItem>
          {children.map((c) => (
            <ToggleGroupItem
              key={c.id}
              value={c.id}
              className="h-11 gap-2 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              {/* Decorative here: the name is the visible label right next to it. */}
              <span aria-hidden className="pointer-events-none">
                <ChildAvatar
                  name={c.display_name}
                  size="sm"
                  avatar={c.avatar}
                  seed={c.id}
                  verified={false}
                />
              </span>
              {c.display_name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {loadFailed ? (
        <div className="flex flex-col gap-3">
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              לא הצלחנו לטעון את התנועות. בדקו את החיבור ונסו שוב.
            </AlertDescription>
          </Alert>
          <Button size="touch" variant="outline" onClick={() => void loadFirstPage(filter)}>
            <RotateCw aria-hidden />
            נסו שוב
          </Button>
        </div>
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          {householdId && (
            <MonthlySummary householdId={householdId} childId={filter === ALL ? null : filter} />
          )}

          {visibleChildren.length > 0 && (
            <Card className="bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  <h2>יתרת ארנק לפי ילד</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {visibleChildren.map((c) => {
                  const balance = Number(c.current_balance ?? 0);
                  return (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span aria-hidden>
                          <ChildAvatar
                            name={c.display_name}
                            size="sm"
                            avatar={c.avatar}
                            seed={c.id}
                          />
                        </span>
                        <span className="font-medium">{c.display_name}</span>
                      </div>
                      <CoinAmount value={balance} tone={toneFor(balance)} animate />
                    </div>
                  );
                })}
                {visibleChildren.length > 1 && (
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <span className="font-bold">סה״כ ארנקים</span>
                    <CoinAmount value={grandTotal} size="lg" tone={toneFor(grandTotal)} animate />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <Receipt className="size-10 opacity-40" aria-hidden />
                {filter === ALL ? (
                  <>
                    <p>אין תנועות עדיין.</p>
                    <Button asChild variant="link" className="h-11">
                      <Link to="/parent/tasks/new">צרו משימה ראשונה</Link>
                    </Button>
                  </>
                ) : (
                  <p>אין תנועות ל{childById[filter]?.display_name ?? "ילד זה"} עדיין.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <section aria-labelledby="tx-list-heading" className="flex flex-col gap-2">
              <h2 id="tx-list-heading" className="sr-only">
                רשימת תנועות
              </h2>
              {/* Replays on filter change; "load more" rows stagger from their page position. */}
              <StaggerList replayKey={filter} className="flex flex-col gap-2">
                {transactions.map((tx, i) => {
                  const child = childById[tx.child_id];
                  const name = child?.display_name ?? "ילד";
                  return (
                    <StaggerItem key={tx.id} index={i % PAGE_SIZE}>
                      <TransactionRow
                        tx={tx}
                        taskTitle={
                          tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined
                        }
                        goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
                        leading={
                          <span aria-hidden>
                            <ChildAvatar
                              name={name}
                              size="sm"
                              avatar={child?.avatar}
                              seed={tx.child_id}
                            />
                          </span>
                        }
                        secondaryLabel={name}
                      />
                    </StaggerItem>
                  );
                })}
              </StaggerList>
              {hasMore && (
                <Button
                  size="touch"
                  variant="outline"
                  className="self-center"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore && <Loader2 className="animate-spin" aria-hidden />}
                  {loadingMore ? "טוען..." : "טען עוד"}
                </Button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
