import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_child/wallet")({
  component: ChildWallet,
});

function ChildWallet() {
  const { childProfileId } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childProfileId) return;

    async function load() {
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("child_profile_id", childProfileId!)
        .order("created_at", { ascending: false });

      const txs = txData || [];
      setTransactions(txs);
      setBalance(txs.reduce((sum, t) => sum + t.amount, 0));
      setLoading(false);
    }

    load();
  }, [childProfileId]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">היתרה שלי</p>
          <p className="mt-1 text-4xl font-bold">🪙 {balance}</p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">היסטוריית תנועות</h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              אין תנועות עדיין. השלימו משימות כדי לצבור מטבעות!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("he-IL")}
                  </p>
                  <span className="flex items-center gap-1 font-bold text-success">
                    +{tx.amount} 🪙
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
