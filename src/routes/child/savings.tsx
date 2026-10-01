import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCw, Target, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "@/components/transaction-row";
import { BalanceHeroSkeleton, ListSkeleton } from "@/components/loading-skeletons";
import { AddGoalDialog } from "@/components/savings/add-goal-dialog";
import { GoalCard } from "@/components/savings/goal-card";
import { MoveToSavingsDialog } from "@/components/savings/move-to-savings-dialog";
import { SavingsHero } from "@/components/savings/savings-hero";
import { useSavingsData } from "@/components/savings/use-savings-data";

export const Route = createFileRoute("/child/savings")({
  component: ChildSavings,
});

function ChildSavings() {
  const {
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
  } = useSavingsData();

  // Add-goal dialog (controlled here so the empty state can open it too)
  const [dialogOpen, setDialogOpen] = useState(false);

  // Move-to-savings dialog
  const [moveOpen, setMoveOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">חיסכון</h1>
        <BalanceHeroSkeleton tall />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="sr-only">חיסכון</h1>
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את החיסכון. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={reload}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">חיסכון</h1>
      {/* A. Savings pot card with wallet chip + move action */}
      <SavingsHero
        savingsBalance={savingsBalance}
        walletBalance={walletBalance}
        savingsPct={savingsPct}
        onMove={() => setMoveOpen(true)}
      />

      <MoveToSavingsDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        walletBalance={walletBalance}
        onSuccess={refresh}
      />

      {recentSavings.length > 0 && (
        <section aria-labelledby="recent-savings-heading">
          <h2 id="recent-savings-heading" className="mb-3 text-lg font-semibold">
            חיסכון אחרון
          </h2>
          <StaggerList className="flex flex-col gap-2">
            {recentSavings.map((tx, i) => (
              <StaggerItem key={tx.id} index={i}>
                <TransactionRow
                  tx={tx}
                  taskTitle={tx.reference_task_id ? taskTitles[tx.reference_task_id] : undefined}
                  goalTitle={tx.goal_id ? goalTitles[tx.goal_id] : undefined}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      {/* B. Goals board */}
      <section aria-labelledby="goals-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="goals-heading" className="text-lg font-semibold">
            המטרות שלי
          </h2>
          <AddGoalDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={refresh} />
        </div>

        {goals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Target className="size-10 opacity-40" aria-hidden />
              <p>עדיין אין מטרות. על מה תרצו לחסוך?</p>
              <Button
                size="touch"
                variant="outline"
                className="mt-1"
                onClick={() => setDialogOpen(true)}
              >
                <Plus aria-hidden />
                הוסיפו מטרה ראשונה
              </Button>
            </CardContent>
          </Card>
        ) : (
          <StaggerList className="grid gap-3 sm:grid-cols-2">
            {goals.map((goal, i) => (
              <StaggerItem key={goal.id} index={i}>
                <GoalCard
                  goal={goal}
                  deposited={depositedByGoal[goal.id] ?? 0}
                  walletBalance={walletBalance}
                  savingsBalance={savingsBalance}
                  onChanged={refresh}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>
    </div>
  );
}
