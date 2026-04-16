import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">תנועות</h1>
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            אין תנועות עדיין.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{children[tx.child_profile_id] || "ילד"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("he-IL")}
                  </p>
                </div>
                <span className="flex items-center gap-1 font-bold text-success">
                  +{tx.amount} 🪙
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
