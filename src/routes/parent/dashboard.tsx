import { CoinAmount } from "@/components/coin-amount";
import { LoadError } from "@/components/load-error";
import { ParentDashboardSkeleton } from "@/components/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChildrenStack } from "@/components/children-stack";
import { ChildTransactions } from "@/components/parent-dashboard/child-transactions";
import { ManualAdjustmentDialog } from "@/components/parent-dashboard/manual-adjustment-dialog";
import { PendingTasks } from "@/components/parent-dashboard/pending-tasks";
import { QuizSettingsCard } from "@/components/parent-dashboard/quiz-settings-card";
import { SavingsPercentCard } from "@/components/parent-dashboard/savings-percent-card";
import { useParentDashboardData } from "@/components/parent-dashboard/use-parent-dashboard-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, PiggyBank, Plus, UserPlus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/parent/dashboard")({
  component: ParentDashboard,
});

function ParentDashboard() {
  const {
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
    reload,
    refresh,
  } = useParentDashboardData();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  if (loading) {
    return <ParentDashboardSkeleton />;
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <LoadError
          message="אופס, לא הצלחנו לטעון את לוח הבקרה. בדקו את האינטרנט ונסו שוב."
          onRetry={reload}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">לוח בקרה</h1>
        <div className="flex gap-2">
          <Button asChild size="touch">
            <Link to="/parent/children/new">
              <UserPlus aria-hidden />
              ילד חדש
            </Link>
          </Button>
          <Button asChild size="touch" variant="outline">
            <Link to="/parent/tasks/new">
              <Plus aria-hidden />
              משימה
            </Link>
          </Button>
        </div>
      </div>
      {householdId && (
        <SavingsPercentCard
          key={`pct-${settingsVersion}`}
          householdId={householdId}
          initialPct={settings.savingsPct}
        />
      )}

      {householdId && (
        <QuizSettingsCard
          key={`quiz-${settingsVersion}`}
          householdId={householdId}
          initialSubjects={settings.quizSubjects}
          initialReward={settings.quizReward}
        />
      )}

      <section aria-labelledby="children-heading">
        <h2 id="children-heading" className="mb-3 text-lg font-semibold">
          ילדים
        </h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <p>עדיין לא הוספתם ילדים.</p>
              <Button asChild variant="link" className="h-11">
                <Link to="/parent/children/new">
                  הוסיפו ילד ראשון
                  <ArrowLeft aria-hidden />
                </Link>
              </Button>
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
        <section aria-labelledby="child-heading" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-y-2 border-t pt-6">
            <h2 id="child-heading" className="text-xl font-bold">
              {selectedChild.display_name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <PiggyBank className="size-4" aria-hidden />
                <span>חיסכון:</span>
                <CoinAmount value={savingsBalances[selectedChild.id] ?? 0} size="lg" animate />
              </span>
              <span className="flex items-center gap-1">
                <span>יתרה:</span>
                <CoinAmount value={balances[selectedChild.id] ?? 0} size="lg" animate />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-touch"
                  aria-label={`עדכון יתרה ידני עבור ${selectedChild.display_name}`}
                  onClick={() => setAdjustDialogOpen(true)}
                >
                  <Pencil aria-hidden />
                </Button>
              </span>
            </div>
          </div>
          <PendingTasks
            childTasks={childTasks}
            acting={acting}
            handleApprove={handleApprove}
            handleReject={handleReject}
          />

          <ChildTransactions childTransactions={childTransactions} taskTitles={taskTitles} />
        </section>
      )}

      <ManualAdjustmentDialog
        child={selectedChild}
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        onSaved={refresh}
      />
    </div>
  );
}
