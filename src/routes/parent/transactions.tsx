import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { ListSkeleton } from "@/components/loading-skeletons";
import { ChildAvatar } from "@/components/child-avatar";

export const Route = createFileRoute("/parent/transactions")({
  component: ParentTransactions,
});

function ParentTransactions() {
  const { householdId } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [children, setChildren] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;

    async function load() {
      const { data: cpData } = await supabase
        .from("child_profiles")
        .select("id, display_name")
        .eq("household_id", householdId!);

      const childMap: Record<string, string> = {};
      (cpData || []).forEach((c) => {
        childMap[c.id] = c.display_name;
      });
      setChildren(childMap);

      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });

      setTransactions(txData || []);
      setLoading(false);
    }

    load();
  }, [householdId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">תנועות</h1>
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">תנועות</h1>
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Receipt className="h-10 w-10 opacity-40" aria-hidden />
            <p>אין תנועות עדיין.</p>
            <Link to="/parent/tasks/new">
              <Button variant="link">צרו משימה ראשונה</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => {
              const name = children[tx.child_id] || "ילד";
              return (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <ChildAvatar name={name} size="sm" />
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("he-IL")}
                        </p>
                      </div>
                    </div>
                    <CoinAmount value={tx.amount} signed tone="success" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Per-child totals + grand total */}
          <Card className="bg-muted/40">
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-semibold text-muted-foreground">סיכום לפי ילד</p>
              {Object.entries(
                transactions.reduce<Record<string, number>>((acc, tx) => {
                  acc[tx.child_id] = (acc[tx.child_id] || 0) + tx.amount;
                  return acc;
                }, {}),
              ).map(([cpId, total]) => {
                const name = children[cpId] || "ילד";
                return (
                  <div key={cpId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChildAvatar name={name} size="sm" />
                      <span className="font-medium">{name}</span>
                    </div>
                    <CoinAmount value={total} tone="success" />
                  </div>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t pt-2">
                <span className="font-bold">סה״כ</span>
                <CoinAmount
                  value={transactions.reduce((sum, t) => sum + t.amount, 0)}
                  size="lg"
                  tone="success"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
