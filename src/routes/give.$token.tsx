import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Coins, Gift, Info, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ChildAvatar } from "@/components/child-avatar";
import { LoadError } from "@/components/load-error";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  GIFT_MAX,
  GIFT_QUICK_AMOUNTS,
  GIFT_REASON_LABELS,
  GIFT_REASONS,
  SENDER_NAME_MAX,
  giftErrorMessage,
  isGiftToken,
  newGiftRequestId,
  rememberGiveReturn,
  type GiftReason,
} from "@/lib/gifts";

// Public landing for a child's gift QR code. Anyone can see whom the code is for (name +
// avatar only, via get_gift_target); sending needs a signed-in adult with a confirmed
// email, and the gift stays pending until a parent of the child approves it.
export const Route = createFileRoute("/give/$token")({
  head: () => ({
    meta: [{ title: "שליחת מתנה — Kasp" }, { name: "robots", content: "noindex" }],
  }),
  component: GivePage,
});

interface GiftTarget {
  display_name: string;
  avatar: string | null;
}

type LoadState = "loading" | "ready" | "not_found" | "error";

function GivePage() {
  const { token } = Route.useParams();
  const { isAuthenticated, isLoading: authLoading, role, user } = useAuth();
  const [target, setTarget] = useState<GiftTarget | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!isGiftToken(token)) {
      setState("not_found");
      return;
    }
    setState("loading");
    const { data, error } = await supabase.rpc("get_gift_target", { _token: token });
    if (error) {
      console.error("[get_gift_target]", error);
      setState("error");
      return;
    }
    const payload = data as {
      display_name?: string;
      avatar?: string | null;
      error?: string;
    } | null;
    if (!payload?.display_name || payload.error) {
      setState("not_found");
      return;
    }
    setTarget({ display_name: payload.display_name, avatar: payload.avatar ?? null });
    setState("ready");
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading" || (state === "ready" && authLoading)) {
    return (
      <Shell>
        <PageHeaderSkeleton back={false} />
        <FormSkeleton fields={3} />
      </Shell>
    );
  }

  if (state === "error") {
    return (
      <Shell>
        <PageHeader title="שליחת מתנה" icon={Gift} />
        <LoadError
          message="לא הצלחנו לטעון את הקוד. בדקו את האינטרנט ונסו שוב."
          onRetry={() => void load()}
        />
      </Shell>
    );
  }

  if (state === "not_found" || !target) {
    return (
      <Shell>
        <PageHeader title="שליחת מתנה" icon={Gift} />
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            הקוד לא תקף, או שההורים החליפו אותו בקוד חדש. בקשו מהם לשלוח לכם את הקוד העדכני.
          </AlertDescription>
        </Alert>
      </Shell>
    );
  }

  const name = target.display_name;

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <ChildAvatar name={name} size="lg" avatar={target.avatar} seed={token} />
        <PageHeader
          title={`מתנה ל${name}`}
          description={`המטבעות יגיעו ל${name} אחרי שההורים יאשרו שקיבלו את הכסף.`}
        />
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Kasp לא מעבירה כסף אמיתי. את הכסף עצמו נותנים להורים (מזומן, ביט וכדומה), וכל מטבע שווה
          ₪1.
        </span>
      </p>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="flex flex-col gap-4 py-6 text-center">
            <p>כדי לשלוח מתנה צריך חשבון Kasp עם כתובת מייל מאומתת.</p>
            <div className="flex flex-col gap-2">
              <Button asChild size="touch" className="w-full">
                <Link to="/login" onClick={() => rememberGiveReturn(token)}>
                  <LogIn aria-hidden />
                  התחברות
                </Link>
              </Button>
              <Button asChild size="touch" variant="outline" className="w-full">
                <Link to="/signup" onClick={() => rememberGiveReturn(token)}>
                  <UserPlus aria-hidden />
                  הרשמה
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : role === "child" ? (
        <Alert role="alert">
          <AlertDescription>רק מבוגרים יכולים לשלוח מתנות.</AlertDescription>
        </Alert>
      ) : (
        <GiftForm
          token={token}
          childName={name}
          defaultSenderName={
            typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""
          }
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <Link
          to="/"
          aria-label="Kasp — דף הבית"
          className="flex min-h-11 items-center gap-2 self-center rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coins className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-bold text-foreground">
            <bdi>Kasp</bdi>
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}

interface FieldErrors {
  name?: string;
  amount?: string;
  reason?: string;
}

function GiftForm({
  token,
  childName,
  defaultSenderName,
}: {
  token: string;
  childName: string;
  defaultSenderName: string;
}) {
  const [senderName, setSenderName] = useState(defaultSenderName.slice(0, SENDER_NAME_MAX));
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState<GiftReason | "">("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentAmount, setSentAmount] = useState<number | null>(null);
  // One id per gift: a double tap or retry of the same gift is deduplicated server-side.
  const [requestId, setRequestId] = useState(newGiftRequestId);

  const parsedAmount = (): number | null => {
    const n = Number(amountInput);
    return Number.isInteger(n) && n >= 1 && n <= GIFT_MAX ? n : null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errs: FieldErrors = {};
    if (!senderName.trim()) errs.name = "הזינו שם שיוצג להורים";
    if (parsedAmount() === null) errs.amount = `סכום שלם בין 1 ל-${GIFT_MAX}`;
    if (!reason) errs.reason = "בחרו סיבה למתנה";
    setFieldErrors(errs);
    setError("");
    if (Object.keys(errs).length === 0) setConfirmOpen(true);
  };

  const send = async () => {
    const amount = parsedAmount();
    if (amount === null || !reason || submitting) return;
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("submit_gift", {
      _token: token,
      _amount: amount,
      _reason: reason,
      _sender_name: senderName.trim(),
      _request_id: requestId,
    });
    setSubmitting(false);
    const payload = data as { success?: boolean; error?: string } | null;
    if (rpcError || !payload?.success) {
      console.error("[submit_gift]", rpcError ?? payload?.error);
      setError(giftErrorMessage(payload?.error ?? ""));
      return;
    }
    setSentAmount(amount);
  };

  const sendAnother = () => {
    setSentAmount(null);
    setAmountInput("");
    setReason("");
    setRequestId(newGiftRequestId());
  };

  if (sentAmount !== null) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center" role="status">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <h2 className="text-lg font-semibold">המתנה נשלחה לאישור ההורים</h2>
          <p className="text-sm text-muted-foreground">
            אחרי שההורים יאשרו, {sentAmount} מטבעות יגיעו ל{childName}. זכרו להעביר להם את הכסף
            עצמו.
          </p>
          <Button size="touch" variant="outline" onClick={sendAnother}>
            <Gift aria-hidden />
            שליחת מתנה נוספת
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-sender">השם שלכם (יוצג להורים)</Label>
        <Input
          id="gift-sender"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          maxLength={SENDER_NAME_MAX}
          autoComplete="name"
          placeholder="למשל: דוד דני"
          aria-invalid={!!fieldErrors.name || undefined}
          aria-describedby={fieldErrors.name ? "gift-sender-error" : undefined}
          className="h-11"
        />
        {fieldErrors.name && (
          <p id="gift-sender-error" className="text-sm text-destructive">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gift-amount">סכום (מטבעות = ₪)</Label>
        <ToggleGroup
          type="single"
          value={GIFT_QUICK_AMOUNTS.some((a) => String(a) === amountInput) ? amountInput : ""}
          onValueChange={(v) => {
            if (v) setAmountInput(v);
          }}
          variant="outline"
          aria-label="סכומים מהירים"
          className="grid grid-cols-4"
        >
          {GIFT_QUICK_AMOUNTS.map((a) => (
            <ToggleGroupItem
              key={a}
              value={String(a)}
              className="h-11 tabular-nums data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              ₪{a}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input
          id="gift-amount"
          type="number"
          inputMode="numeric"
          min={1}
          max={GIFT_MAX}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="או סכום אחר"
          aria-invalid={!!fieldErrors.amount || undefined}
          aria-describedby={fieldErrors.amount ? "gift-amount-error" : undefined}
          className="h-11 tabular-nums"
          dir="ltr"
        />
        {fieldErrors.amount && (
          <p id="gift-amount-error" className="text-sm text-destructive">
            {fieldErrors.amount}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span id="gift-reason-label" className="text-sm font-medium">
          לרגל מה?
        </span>
        <ToggleGroup
          type="single"
          value={reason}
          onValueChange={(v) => {
            if ((GIFT_REASONS as readonly string[]).includes(v)) setReason(v as GiftReason);
          }}
          variant="outline"
          aria-labelledby="gift-reason-label"
          aria-describedby={fieldErrors.reason ? "gift-reason-error" : undefined}
          className="grid grid-cols-2 sm:grid-cols-3"
        >
          {GIFT_REASONS.map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              className="h-11 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              {GIFT_REASON_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {fieldErrors.reason && (
          <p id="gift-reason-error" className="text-sm text-destructive">
            {fieldErrors.reason}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" size="touch" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Gift aria-hidden />}
        {submitting ? "שולח..." : "שליחת מתנה"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              לשלוח ל{childName} מתנה של ₪{parsedAmount() ?? 0}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              המתנה תמתין לאישור ההורים. הם יאשרו אותה אחרי שיקבלו מכם את הכסף.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => void send()}>שליחה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
