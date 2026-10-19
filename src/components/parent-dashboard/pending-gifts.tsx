import { Check, Gift, Loader2, X } from "lucide-react";
import { CoinAmount } from "@/components/coin-amount";
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
import type { TaskAction } from "@/components/parent-dashboard/pending-tasks";
import type { GiftRow } from "@/components/parent-dashboard/types";
import { giftReasonLabel } from "@/lib/gifts";

interface PendingGiftsProps {
  /** The selected child's pending gifts. Renders nothing when empty. */
  childGifts: GiftRow[];
  /** The approve/reject currently in flight, if any (shared with task review). */
  acting: TaskAction;
  savingsPct: number;
  handleApprove: (giftId: string) => void;
  handleReject: (giftId: string) => void;
}

/** "מתנות ממתינות": QR-code gifts waiting for the parent; approving posts them to the ledger. */
export function PendingGifts({
  childGifts,
  acting,
  savingsPct,
  handleApprove,
  handleReject,
}: PendingGiftsProps) {
  if (childGifts.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Gift className="size-4 text-primary" aria-hidden />
        מתנות ממתינות לאישור
      </h3>
      <ul className="flex flex-col gap-2">
        {childGifts.map((g) => {
          const busy = acting !== null;
          const kind = acting?.id === g.id ? acting.kind : null;
          const save = Math.floor((g.amount * savingsPct) / 100);
          return (
            <li key={g.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        <bdi>{g.sender_name}</bdi> · {giftReasonLabel(g.reason)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.sender_email && (
                          <>
                            <bdi dir="ltr">{g.sender_email}</bdi> ·{" "}
                          </>
                        )}
                        {new Date(g.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    <CoinAmount value={g.amount} />
                  </div>
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="touch"
                          className="bg-success text-success-foreground hover:bg-success/90"
                          disabled={busy}
                          aria-label={`אשר מתנה מ${g.sender_name}`}
                        >
                          {kind === "approve" ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <Check aria-hidden />
                          )}
                          אשר
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            קיבלתם ₪{g.amount} מ{g.sender_name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            אשרו רק אחרי שהכסף הגיע אליכם.{" "}
                            {save > 0
                              ? `${g.amount - save} מטבעות ייכנסו לארנק ו-${save} לחיסכון.`
                              : `${g.amount} מטבעות ייכנסו לארנק.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleApprove(g.id)}>
                            אישור המתנה
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="touch"
                          variant="destructive"
                          disabled={busy}
                          aria-label={`דחה מתנה מ${g.sender_name}`}
                        >
                          {kind === "reject" ? (
                            <Loader2 className="animate-spin" aria-hidden />
                          ) : (
                            <X aria-hidden />
                          )}
                          דחה
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>לדחות את המתנה?</AlertDialogTitle>
                          <AlertDialogDescription>
                            המתנה מ{g.sender_name} תסומן כנדחתה והילד לא יזוכה במטבעות.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleReject(g.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            דחה מתנה
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
