import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Pencil, UserPlus, Users } from "lucide-react";
import { ListSkeleton } from "@/components/loading-skeletons";
import { ChildAvatar } from "@/components/child-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { BAND_LABELS_HE, DEFAULT_BAND, ageInYears, bandForBirthdate } from "@/lib/quiz-bank";
import { DEFAULT_COLOR_KEY, DEFAULT_ICON_KEY, parseAvatar, serializeAvatar } from "@/lib/avatars";

export const Route = createFileRoute("/parent/children/")({
  component: ChildrenList,
});

interface ChildRow {
  id: string;
  display_name: string;
  user_id: string;
  birthdate: string | null;
  avatar: string | null;
}

function ChildrenList() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChildRow | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("child_profiles")
      .select("id, display_name, user_id, birthdate, avatar")
      .eq("household_id", householdId)
      .order("display_name", { ascending: true });
    setChildren(data || []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ילדים</h1>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Button asChild size="touch">
          <Link to="/parent/children/new">
            <UserPlus aria-hidden />
            ילד חדש
          </Link>
        </Button>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" aria-hidden />
            <p>עדיין לא הוספתם ילדים.</p>
            <Button asChild variant="link" className="mt-1 h-11">
              <Link to="/parent/children/new">
                הוסיפו ילד ראשון
                <ArrowLeft aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.id}>
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <span className="flex items-center gap-2">
                    <ChildAvatar
                      name={child.display_name}
                      size="md"
                      avatar={child.avatar}
                      seed={child.id}
                    />
                    <span className="leading-tight">
                      <span className="block font-medium">{child.display_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        <BirthdateSummary birthdate={child.birthdate} />
                      </span>
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label={`עריכת ${child.display_name}`}
                    onClick={() => setEditing(child)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <EditBirthdateDialog
        child={editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={load}
      />
    </div>
  );
}

function BirthdateSummary({ birthdate }: { birthdate: string | null }) {
  if (!birthdate) return <>תאריך לידה לא הוגדר · רמת {BAND_LABELS_HE[DEFAULT_BAND]}</>;
  const age = ageInYears(birthdate);
  const band = bandForBirthdate(birthdate);
  if (age === null) return <>תאריך לידה לא הוגדר · רמת {BAND_LABELS_HE[DEFAULT_BAND]}</>;
  return (
    <>
      גיל {age} · {BAND_LABELS_HE[band]}
    </>
  );
}

function EditBirthdateDialog({
  child,
  onOpenChange,
  onSaved,
}: {
  child: ChildRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [iconKey, setIconKey] = useState(DEFAULT_ICON_KEY);
  const [colorKey, setColorKey] = useState(DEFAULT_COLOR_KEY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setValue(child?.birthdate ?? "");
    if (child) {
      const resolved = parseAvatar(child.avatar, child.id);
      setIconKey(resolved.icon.key);
      setColorKey(resolved.color.key);
    } else {
      setIconKey(DEFAULT_ICON_KEY);
      setColorKey(DEFAULT_COLOR_KEY);
    }
  }, [child]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!child) return;
    setSubmitting(true);

    setError("");
    // Two independent RPCs: report each result so a partial save is never hidden.
    const failed: string[] = [];

    const { data: aData, error: aErr } = await supabase.rpc("set_child_avatar", {
      _child_id: child.id,
      _avatar: serializeAvatar(iconKey, colorKey),
    });
    const aPayload = aData as Record<string, unknown> | null;
    if (aErr || typeof aPayload?.error === "string") {
      console.error("[set_child_avatar]", aErr ?? aPayload?.error);
      failed.push("הדמות");
    }

    if (value) {
      const { data, error } = await supabase.rpc("set_child_birthdate", {
        _child_id: child.id,
        _birthdate: value,
      });
      const payload = data as Record<string, unknown> | null;
      if (error || typeof payload?.error === "string") {
        console.error("[set_child_birthdate]", error ?? payload?.error);
        failed.push("תאריך הלידה");
      }
    }

    setSubmitting(false);
    const attempted = value ? 2 : 1;
    if (failed.length > 0) {
      // Something may still have been saved: refresh the list behind the dialog.
      if (failed.length < attempted) await onSaved();
      setError(
        failed.length < attempted
          ? `חלק מהפרטים נשמרו, אך לא הצלחנו לעדכן את ${failed.join(" ואת ")}. נסו שוב.`
          : "לא הצלחנו לשמור את השינויים. נסו שוב.",
      );
      return;
    }
    toast.success("הפרטים עודכנו");
    onOpenChange(false);
    await onSaved();
  };

  return (
    <Dialog open={!!child} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת ילד — {child?.display_name}</DialogTitle>
          <DialogDescription>בחרו דמות וצבע, ועדכנו את תאריך הלידה לפי הצורך.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {/* The picker labels its own two radio groups ("בחרו דמות" / "צבע"). */}
          <AvatarPicker
            iconKey={iconKey}
            colorKey={colorKey}
            onChange={(i, c) => {
              setIconKey(i);
              setColorKey(c);
            }}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-birthdate">תאריך לידה</Label>
            <Input
              id="edit-birthdate"
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="2000-01-01"
              max={new Date().toISOString().slice(0, 10)}
              dir="ltr"
              className="h-11"
            />
          </div>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" size="touch" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {submitting ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
