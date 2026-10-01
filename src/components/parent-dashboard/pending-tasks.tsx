import { Link } from "@tanstack/react-router";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
import { StatusBadge } from "@/components/status-badge";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TaskRow } from "@/components/parent-dashboard/types";

export type TaskAction = { id: string; kind: "approve" | "reject" } | null;

interface PendingTasksProps {
  /** The selected child's open tasks (assigned + submitted). */
  childTasks: TaskRow[];
  /** The approve/reject currently in flight, if any. */
  acting: TaskAction;
  handleApprove: (taskId: string) => void;
  handleReject: (taskId: string) => void;
}

/** "משימות בתור": cards on mobile, a table from md up, approve/reject on submitted tasks. */
export function PendingTasks({
  childTasks,
  acting,
  handleApprove,
  handleReject,
}: PendingTasksProps) {
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">משימות בתור</h3>
      {childTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Inbox className="size-8 opacity-50" aria-hidden />
            <p>אין משימות פתוחות לילד זה.</p>
            <Button asChild variant="link" className="h-11">
              <Link to="/parent/tasks/new">צרו משימה חדשה</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards (a 4-column table would scroll sideways). */}
          <ul className="flex flex-col gap-2 md:hidden">
            {childTasks.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/parent/tasks/$taskId"
                        params={{ taskId: t.id }}
                        className="min-w-0 rounded font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t.title}
                      </Link>
                      <CoinAmount value={t.reward_amount} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={t.status} />
                      {t.status === "submitted" && (
                        <TaskReviewActions
                          title={t.title}
                          acting={acting?.id === t.id ? acting.kind : null}
                          onApprove={() => handleApprove(t.id)}
                          onReject={() => handleReject(t.id)}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table. */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>משימה</TableHead>
                    <TableHead>תגמול</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>פעולה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childTasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          to="/parent/tasks/$taskId"
                          params={{ taskId: t.id }}
                          className="rounded font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                          <TaskReviewActions
                            title={t.title}
                            acting={acting?.id === t.id ? acting.kind : null}
                            onApprove={() => handleApprove(t.id)}
                            onReject={() => handleReject(t.id)}
                          />
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
        </>
      )}
    </div>
  );
}

function TaskReviewActions({
  title,
  acting,
  onApprove,
  onReject,
}: {
  title: string;
  /** Which action is in flight for this task, if any. */
  acting: "approve" | "reject" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const busy = acting !== null;
  return (
    <div className="flex gap-2">
      <Button
        size="touch"
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={onApprove}
        disabled={busy}
        aria-label={`אשר את ${title}`}
      >
        {acting === "approve" ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Check aria-hidden />
        )}
        אשר
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="touch" variant="destructive" disabled={busy} aria-label={`דחה את ${title}`}>
            {acting === "reject" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <X aria-hidden />
            )}
            דחה
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לדחות את המשימה?</AlertDialogTitle>
            <AlertDialogDescription>
              המשימה &quot;{title}&quot; תסומן כנדחתה והילד לא יזוכה במטבעות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={onReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              דחה משימה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
