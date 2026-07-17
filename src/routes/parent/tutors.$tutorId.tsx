import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bot, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DetailSkeleton, ListSkeleton } from "@/components/loading-skeletons";
import { supabase } from "@/integrations/supabase/client";
import {
  LANGUAGE_LABELS_HE,
  PERSONALITY_LABELS_HE,
  TUTOR_LANGUAGES,
  TUTOR_PERSONALITIES,
  TUTOR_VOICES,
  type TutorLanguage,
  type TutorPersonality,
} from "@/lib/tutors";

export const Route = createFileRoute("/parent/tutors/$tutorId")({
  component: TutorDetail,
});

interface TutorRow {
  id: string;
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  voice_id: string;
  language: TutorLanguage;
  active: boolean;
}

interface SessionRow {
  id: string;
  child_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
}

const SESSION_STATUS_LABELS_HE: Record<string, string> = {
  active: "בעיצומה",
  completed: "הסתיימה",
  failed: "נכשלה",
};

function TutorDetail() {
  const { tutorId } = Route.useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState<TutorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [childNames, setChildNames] = useState<Record<string, string>>({});
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tutors")
      .select("id, name, subject, topic, personality, voice_id, language, active")
      .eq("id", tutorId)
      .maybeSingle();
    setTutor((data as TutorRow) ?? null);
    setLoading(false);
  }, [tutorId]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    const { data: sData } = await supabase
      .from("tutor_sessions")
      .select("id, child_id, started_at, ended_at, status")
      .eq("tutor_id", tutorId)
      .order("started_at", { ascending: false })
      .limit(20);
    const rows = (sData ?? []) as SessionRow[];
    setSessions(rows);

    const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
    if (childIds.length > 0) {
      const { data: cData } = await supabase
        .from("child_profiles")
        .select("id, display_name")
        .in("id", childIds);
      const map: Record<string, string> = {};
      (cData ?? []).forEach((c: { id: string; display_name: string }) => {
        map[c.id] = c.display_name;
      });
      setChildNames(map);
    }
    setSessionsLoading(false);
  }, [tutorId]);

  useEffect(() => {
    load();
    loadSessions();
  }, [load, loadSessions]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!tutor) return;
    setError("");
    setSaving(true);

    const { error: updateError } = await supabase
      .from("tutors")
      .update({
        name: tutor.name,
        subject: tutor.subject,
        topic: tutor.topic,
        personality: tutor.personality,
        voice_id: tutor.voice_id,
        language: tutor.language,
        active: tutor.active,
      })
      .eq("id", tutorId);

    setSaving(false);
    if (updateError) {
      console.error("[tutors.$tutorId] update failed:", updateError);
      setError(import.meta.env.DEV ? `שגיאה בשמירה: ${updateError.message}` : "שגיאה בשמירת החונך");
      return;
    }
    toast.success("הפרטים נשמרו");
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("tutors")
      .update({ active: false })
      .eq("id", tutorId);

    setDeleting(false);
    if (deleteError) {
      console.error("[tutors.$tutorId] delete failed:", deleteError);
      toast.error(
        import.meta.env.DEV ? `שגיאה במחיקה: ${deleteError.message}` : "שגיאה במחיקת החונך",
      );
      return;
    }
    toast.success("החונך הוסר");
    navigate({ to: "/parent/tutors" });
  };

  if (loading) return <DetailSkeleton />;
  if (!tutor) return <div className="text-muted-foreground">החונך לא נמצא</div>;

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tutor.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-name">שם החונך</Label>
              <Input
                id="edit-name"
                value={tutor.name}
                onChange={(e) => setTutor({ ...tutor, name: e.target.value })}
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">מקצוע</Label>
              <Input
                id="edit-subject"
                value={tutor.subject}
                onChange={(e) => setTutor({ ...tutor, subject: e.target.value })}
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-topic">נושא השיחה</Label>
              <Textarea
                id="edit-topic"
                value={tutor.topic}
                onChange={(e) => setTutor({ ...tutor, topic: e.target.value })}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-personality">סגנון</Label>
              <Select
                value={tutor.personality}
                onValueChange={(v) => setTutor({ ...tutor, personality: v as TutorPersonality })}
              >
                <SelectTrigger id="edit-personality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TUTOR_PERSONALITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERSONALITY_LABELS_HE[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-voice">קול</Label>
              <Select
                value={tutor.voice_id}
                onValueChange={(v) => setTutor({ ...tutor, voice_id: v })}
              >
                <SelectTrigger id="edit-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TUTOR_VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">שפת שיחה</Label>
              <Select
                value={tutor.language}
                onValueChange={(v) => setTutor({ ...tutor, language: v as TutorLanguage })}
              >
                <SelectTrigger id="edit-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TUTOR_LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUAGE_LABELS_HE[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <Label htmlFor="edit-active" className="cursor-pointer">
                פעיל (מוצג לילדים)
              </Label>
              <Switch
                id="edit-active"
                checked={tutor.active}
                onCheckedChange={(checked) => setTutor({ ...tutor, active: checked })}
              />
            </div>
            <Button type="submit" className="min-h-11 w-full" disabled={saving}>
              {saving ? "שומר..." : "שמור"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="min-h-11 w-full" disabled={deleting}>
            {deleting ? "מוחק..." : "מחק חונך"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את החונך?</AlertDialogTitle>
            <AlertDialogDescription>
              החונך יוסתר מהילדים ולא יופיע להם יותר ברשימת החונכים. ניתן להפעיל אותו מחדש דרך
              העריכה בכל שלב.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק חונך
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section aria-label="שיחות קודמות" className="space-y-3">
        <h2 className="text-lg font-semibold">שיחות קודמות</h2>
        {sessionsLoading ? (
          <ListSkeleton rows={2} />
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Bot className="h-8 w-8 opacity-40" aria-hidden />
              <p className="text-sm">עדיין לא היו שיחות עם החונך הזה.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                to="/parent/tutors/$tutorId/sessions/$sessionId"
                params={{ tutorId, sessionId: s.id }}
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between py-3">
                    <span className="leading-tight">
                      <span className="block text-sm font-medium">
                        {childNames[s.child_id] ?? "ילד"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {new Date(s.started_at).toLocaleString("he-IL")}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {SESSION_STATUS_LABELS_HE[s.status] ?? s.status}
                      </span>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
