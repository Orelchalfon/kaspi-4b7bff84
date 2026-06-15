import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import { Pencil, UserPlus, Users } from "lucide-react";
import { ListSkeleton } from "@/components/loading-skeletons";
import { ChildAvatar } from "@/components/child-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { LEVEL_LABELS_HE, ageInYears, levelForBirthdate } from "@/lib/quiz-bank";
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
      .eq("household_id", householdId);
    setChildren(data || []);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ילדים</h1>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Link to="/parent/children/new">
          <Button size="sm" className="min-h-10">
            <UserPlus className="h-4 w-4" aria-hidden />
            <span className="ms-1.5">ילד חדש</span>
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" aria-hidden />
            <p>עדיין לא הוספתם ילדים.</p>
            <Link to="/parent/children/new">
              <Button variant="link" className="mt-1">
                הוסיפו ילד ראשון
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <Card key={child.id}>
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
                  size="icon"
                  aria-label="עריכת ילד"
                  onClick={() => setEditing(child)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
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
  if (!birthdate) return <>תאריך לידה לא הוגדר · רמת {LEVEL_LABELS_HE.middle}</>;
  const age = ageInYears(birthdate);
  const level = levelForBirthdate(birthdate);
  if (age === null) return <>תאריך לידה לא הוגדר · רמת {LEVEL_LABELS_HE.middle}</>;
  return (
    <>
      גיל {age} · רמת {LEVEL_LABELS_HE[level]}
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

  useEffect(() => {
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

    let ok = true;

    const { data: aData, error: aErr } = await supabase.rpc("set_child_avatar", {
      _child_id: child.id,
      _avatar: serializeAvatar(iconKey, colorKey),
    });
    const aPayload = aData as Record<string, unknown> | null;
    if (aErr || typeof aPayload?.error === "string") {
      console.error("[set_child_avatar]", aErr ?? aPayload?.error);
      ok = false;
    }

    if (value) {
      const { data, error } = await supabase.rpc("set_child_birthdate", {
        _child_id: child.id,
        _birthdate: value,
      });
      const payload = data as Record<string, unknown> | null;
      if (error || typeof payload?.error === "string") {
        console.error("[set_child_birthdate]", error ?? payload?.error);
        ok = false;
      }
    }

    setSubmitting(false);
    if (!ok) {
      toast.error("שגיאה בעדכון פרטי הילד");
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
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>דמות</Label>
            <AvatarPicker
              iconKey={iconKey}
              colorKey={colorKey}
              onChange={(i, c) => {
                setIconKey(i);
                setColorKey(c);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-birthdate">תאריך לידה</Label>
            <Input
              id="edit-birthdate"
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="2000-01-01"
              max={new Date().toISOString().slice(0, 10)}
              dir="ltr"
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="min-h-11 w-full" disabled={submitting}>
              {submitting ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
