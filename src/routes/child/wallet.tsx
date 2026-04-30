import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, ArrowDownLeft, Receipt } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { ListSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/child/wallet")({
  component: ChildWallet,
});

const WALLET_TYPES = ["reward_credit", "manual_adjustment", "wallet_debit", "goal_credit"];

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
      const walletTxs = txs.filter((t: any) => WALLET_TYPES.includes(t.type));
      setTransactions(walletTxs);
      setBalance(walletTxs.reduce((sum: number, t: any) => sum + t.amount, 0));
      setLoading(false);
    }

    load();
  }, [childProfileId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-primary/10"><CardContent className="h-24" /></Card>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground" aria-label={`היתרה שלי: ${balance} מטבעות`}>
        <CardContent className="py-6 text-center">
          <p className="text-sm opacity-80">היתרה שלי</p>
          <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
            <Coins className="h-8 w-8 text-coin" aria-hidden />
            <span>{balance}</span>
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">היסטוריית תנועות</h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 opacity-40" aria-hidden />
              <p>אין תנועות עדיין. השלימו משימות כדי לצבור מטבעות!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success">
                      <ArrowDownLeft className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <CoinAmount value={tx.amount} signed tone="success" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
