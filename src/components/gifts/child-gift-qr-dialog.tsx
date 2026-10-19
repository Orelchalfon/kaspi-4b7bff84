import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Loader2, RefreshCw, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadError } from "@/components/load-error";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { giftUrl } from "@/lib/gifts";

/**
 * "קוד מתנה": the child's gift QR code + link (child_gift_token RPC, created on first
 * open). Anyone who scans it can send a gift that waits for the parent's approval.
 * "צור קוד חדש" rotates the token so the old printed/shared code stops working.
 */
export function ChildGiftQrDialog({
  child,
  onOpenChange,
}: {
  child: { id: string; display_name: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rotating, setRotating] = useState(false);

  const fetchToken = useCallback(
    async (rotate: boolean) => {
      if (!child) return;
      const { data, error } = await supabase.rpc("child_gift_token", {
        _child_id: child.id,
        _rotate: rotate,
      });
      const payload = data as { token?: string; error?: string } | null;
      if (error || !payload?.token) {
        console.error("[child_gift_token]", error ?? payload?.error);
        if (rotate) toast.error("לא הצלחנו ליצור קוד חדש. נסו שוב.");
        else setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setToken(payload.token);
      if (rotate) toast.success("נוצר קוד חדש. הקוד הקודם כבר לא פעיל.");
    },
    [child],
  );

  useEffect(() => {
    setToken(null);
    setLoadFailed(false);
    if (child) void fetchToken(false);
  }, [child, fetchToken]);

  const url = token ? giftUrl(token) : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("הקישור הועתק");
    } catch {
      toast.error("לא הצלחנו להעתיק. סמנו את הקישור והעתיקו ידנית.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `מתנה ל${child?.display_name ?? ""} ב-Kasp`, url });
    } catch {
      // User closed the share sheet — nothing to do.
    }
  };

  const rotate = async () => {
    setRotating(true);
    await fetchToken(true);
    setRotating(false);
  };

  return (
    <Dialog open={!!child} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>קוד מתנה — {child?.display_name}</DialogTitle>
          <DialogDescription>
            סבים, דודים וחברים יכולים לסרוק את הקוד ולשלוח מתנה. כל מתנה ממתינה לאישור שלכם, ואת
            הכסף עצמו מקבלים אתם.
          </DialogDescription>
        </DialogHeader>

        {loadFailed ? (
          <LoadError
            message="לא הצלחנו לטעון את קוד המתנה. נסו שוב."
            onRetry={() => void fetchToken(false)}
          />
        ) : !token ? (
          <Skeleton className="mx-auto size-56 rounded-xl" />
        ) : (
          <div className="flex flex-col gap-4">
            {/* QR codes need a light quiet zone to scan, in dark mode too. */}
            <div className="mx-auto rounded-xl bg-white p-4">
              <QRCodeSVG
                value={url}
                size={208}
                level="M"
                role="img"
                aria-label={`קוד QR למתנה ל${child?.display_name ?? ""}`}
              />
            </div>
            <p dir="ltr" className="break-all text-center text-xs text-muted-foreground">
              {url}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="touch" variant="outline" onClick={() => void copy()}>
                <Copy aria-hidden />
                העתקת קישור
              </Button>
              {canShare ? (
                <Button size="touch" variant="outline" onClick={() => void share()}>
                  <Share2 aria-hidden />
                  שיתוף
                </Button>
              ) : (
                <span aria-hidden />
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="touch"
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={rotating}
                >
                  {rotating ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw aria-hidden />
                  )}
                  צור קוד חדש
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>ליצור קוד חדש?</AlertDialogTitle>
                  <AlertDialogDescription>
                    הקוד הנוכחי יפסיק לעבוד, כולל קישורים ששיתפתם או הדפסתם. מתנות שכבר נשלחו יישארו
                    ממתינות לאישור.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void rotate()}>צור קוד חדש</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
