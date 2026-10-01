import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Radio,
  SearchX,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { FormSkeleton, ListSkeleton, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
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
import { cn } from "@/lib/utils";

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

const SESSIONS_PAGE = 20;
const BACK = { to: "/parent/tutors", label: "חזרה לחונכים" } as const;

// Status never by color alone: each badge carries an icon + label.
const SESSION_STATUS: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  active: { label: "בעיצומה", icon: Radio, className: "bg-primary/10 text-primary" },
  completed: {
    label: "הסתיימה",
    icon: CheckCircle2,
    className: "bg-secondary text-secondary-foreground",
  },
  failed: { label: "נכשלה", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const EDITABLE_FIELDS = [
  "name",
  "subject",
  "topic",
  "personality",
  "voice_id",
  "language",
  "active",
] as const;

function TutorDetail() {
  const { tutorId } = Route.useParams();
  const navigate = useNavigate();
  // `saved` is the last persisted state; `tutor` is the form draft. The page title,
  // dirty check and danger zone all read `saved`, so they don't change while typing.
  const [saved, setSaved] = useState<TutorRow | null>(null);
  const [tutor, setTutor] = useState<TutorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [childNames, setChildNames] = useState<Record<string, string>>({});
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tutors")
      .select("id, name, subject, topic, personality, voice_id, language, active")
      .eq("id", tutorId)
      .maybeSingle();
    setSaved((data as TutorRow) ?? null);
    setTutor((data as TutorRow) ?? null);
    setLoading(false);
  }, [tutorId]);

  const fetchSessions = useCallback(
    async (offset: number) => {
      // One extra row tells us whether another page exists.
      const { data: sData } = await supabase
        .from("tutor_sessions")
        .select("id, child_id, started_at, ended_at, status")
        .eq("tutor_id", tutorId)
        .order("started_at", { ascending: false })
        .range(offset, offset + SESSIONS_PAGE);
      const rows = (sData ?? []) as SessionRow[];
      const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
      if (childIds.length > 0) {
        const { data: cData } = await supabase
          .from("child_profiles")
          .select("id, display_name")
          .in("id", childIds);
        setChildNames((m) => ({
          ...m,
          ...Object.fromEntries((cData ?? []).map((c) => [c.id, c.display_name])),
        }));
      }
      setHasMoreSessions(rows.length > SESSIONS_PAGE);
      return rows.slice(0, SESSIONS_PAGE);
    },
    [tutorId],
  );

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessions(await fetchSessions(0));
    setSessionsLoading(false);
  }, [fetchSessions]);

  const loadMoreSessions = async () => {
    setLoadingMoreSessions(true);
    const more = await fetchSessions(sessions.length);
    setSessions((prev) => [...prev, ...more]);
    setLoadingMoreSessions(false);
  };

  useEffect(() => {
    load();
    loadSessions();
  }, [load, loadSessions]);

  const dirty =
    !!saved && !!tutor && EDITABLE_FIELDS.some((field) => saved[field] !== tutor[field]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!tutor || !dirty || saving) return;
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
    setSaved(tutor);
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

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <PageHeaderSkeleton />
        <FormSkeleton fields={6} />
      </div>
    );
  }

  if (!saved || !tutor) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <PageHeader title="החונך לא נמצא" back={BACK} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <SearchX className="size-10 opacity-40" aria-hidden />
            <p>ייתכן שהחונך נמחק או שהקישור שגוי.</p>
            <Button asChild size="touch">
              <Link to="/parent/tutors">לרשימת החונכים</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeader
        title={saved.name}
        description={saved.active ? saved.subject : `${saved.subject} · לא פעיל`}
        back={BACK}
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">שם החונך</Label>
              <Input
                id="edit-name"
                value={tutor.name}
                onChange={(e) => setTutor({ ...tutor, name: e.target.value })}
                maxLength={60}
                required
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-subject">מקצוע</Label>
              <Input
                id="edit-subject"
                value={tutor.subject}
                onChange={(e) => setTutor({ ...tutor, subject: e.target.value })}
                maxLength={60}
                required
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-topic">נושא השיחה</Label>
              <Textarea
                id="edit-topic"
                value={tutor.topic}
                onChange={(e) => setTutor({ ...tutor, topic: e.target.value })}
                maxLength={200}
                required
                aria-describedby="edit-topic-count"
              />
              <p
                id="edit-topic-count"
                className="text-end text-xs tabular-nums text-muted-foreground"
              >
                {tutor.topic.length}/200
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-personality">סגנון</Label>
              <Select
                value={tutor.personality}
                onValueChange={(v) => setTutor({ ...tutor, personality: v as TutorPersonality })}
              >
                <SelectTrigger id="edit-personality" className="h-11">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-voice">קול</Label>
              <Select
                value={tutor.voice_id}
                onValueChange={(v) => setTutor({ ...tutor, voice_id: v })}
              >
                <SelectTrigger id="edit-voice" className="h-11">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-language">שפת שיחה</Label>
              <Select
                value={tutor.language}
                onValueChange={(v) => setTutor({ ...tutor, language: v as TutorLanguage })}
              >
                <SelectTrigger id="edit-language" className="h-11">
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
            <div className="flex min-h-11 items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="edit-active" className="cursor-pointer">
                פעיל (מוצג לילדים)
              </Label>
              <Switch
                id="edit-active"
                checked={tutor.active}
                onCheckedChange={(checked) => setTutor({ ...tutor, active: checked })}
              />
            </div>
            <Button type="submit" size="touch" className="w-full" disabled={saving || !dirty}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {saving ? "שומר..." : dirty ? "שמור שינויים" : "אין שינויים לשמירה"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
        <h2 id="sessions-heading" className="text-lg font-semibold">
          שיחות קודמות
        </h2>
        {sessionsLoading ? (
          <ListSkeleton rows={2} />
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Bot className="size-8 opacity-40" aria-hidden />
              <p className="text-sm">עדיין לא היו שיחות עם החונך הזה.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <StaggerList className="flex flex-col gap-2">
              {sessions.map((s, i) => {
                const status = SESSION_STATUS[s.status];
                const StatusIcon = status?.icon;
                return (
                  <StaggerItem key={s.id} index={i % SESSIONS_PAGE}>
                    <Link
                      to="/parent/tutors/$tutorId/sessions/$sessionId"
                      params={{ tutorId, sessionId: s.id }}
                      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex min-h-11 items-center justify-between py-3">
                          <span className="leading-tight">
                            <span className="block text-sm font-medium">
                              {childNames[s.child_id] ?? "ילד"}
                            </span>
                            <span className="block text-xs tabular-nums text-muted-foreground">
                              {new Date(s.started_at).toLocaleString("he-IL")}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 border-transparent font-medium",
                                status?.className ?? "bg-muted text-muted-foreground",
                              )}
                            >
                              {StatusIcon && <StatusIcon className="size-3.5" aria-hidden />}
                              {status?.label ?? s.status}
                            </Badge>
                            {/* Forward in RTL points left. */}
                            <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerList>
            {hasMoreSessions && (
              <Button
                size="touch"
                variant="outline"
                className="self-center"
                onClick={() => void loadMoreSessions()}
                disabled={loadingMoreSessions}
              >
                {loadingMoreSessions && <Loader2 className="animate-spin" aria-hidden />}
                {loadingMoreSessions ? "טוען..." : "טען עוד שיחות"}
              </Button>
            )}
          </>
        )}
      </section>

      {/* Danger zone: last on the page, separated from routine edits. Hidden once the
          tutor is already inactive — "delete" only hides it, same as the Active switch. */}
      {saved.active && (
        <section
          aria-labelledby="danger-heading"
          className="flex flex-col gap-3 rounded-xl border border-destructive/40 p-4"
        >
          <div>
            <h2 id="danger-heading" className="font-semibold text-destructive">
              אזור מסוכן
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              הסרת החונך תסתיר אותו מהילדים. אפשר להחזיר אותו בכל שלב דרך המתג &quot;פעיל&quot;.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="touch" className="w-full" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 aria-hidden />
                )}
                {deleting ? "מסיר..." : "הסר חונך"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>להסיר את {saved.name}?</AlertDialogTitle>
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
                  הסר חונך
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      )}
    </div>
  );
}
