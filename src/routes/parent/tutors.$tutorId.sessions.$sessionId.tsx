import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MessageSquareOff, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSkeleton, PageHeaderSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getTutorSessionTranscript, type TutorTranscriptMessage } from "@/server/tutor-transcript";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent/tutors/$tutorId/sessions/$sessionId")({
  component: SessionTranscript,
});

interface SessionMeta {
  child_id: string;
  started_at: string;
  ended_at: string | null;
}

function durationLabel(start: string, end: string | null): string | null {
  if (!end) return null;
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 1) return "פחות מדקה";
  return minutes === 1 ? "דקה אחת" : `${minutes} דקות`;
}

function SessionTranscript() {
  const { tutorId, sessionId } = Route.useParams();
  const { session } = useAuth();
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [tutorName, setTutorName] = useState("");
  const [childName, setChildName] = useState("");
  const [transcript, setTranscript] = useState<TutorTranscriptMessage[]>([]);
  const [transcriptFailed, setTranscriptFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const accessToken = session?.access_token;

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setTranscriptFailed(false);

    const [{ data: sData }, { data: tData }] = await Promise.all([
      supabase
        .from("tutor_sessions")
        .select("child_id, started_at, ended_at")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase.from("tutors").select("name").eq("id", tutorId).maybeSingle(),
    ]);
    setTutorName(tData?.name ?? "");

    if (sData) {
      setMeta(sData as SessionMeta);
      const { data: cData } = await supabase
        .from("child_profiles")
        .select("display_name")
        .eq("id", sData.child_id)
        .maybeSingle();
      setChildName(cData?.display_name ?? "");
    }

    try {
      const result = await getTutorSessionTranscript({
        data: { sessionId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTranscript(result.transcript);
    } catch (err) {
      console.error("[getTutorSessionTranscript]", err);
      // Shown inline with a retry — not collapsed into the "no transcript" empty state.
      setTranscriptFailed(true);
    }
    setLoading(false);
  }, [accessToken, sessionId, tutorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const back = { to: `/parent/tutors/${tutorId}`, label: "חזרה לחונך" };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <PageHeaderSkeleton />
        <DetailSkeleton />
      </div>
    );
  }

  const duration = meta ? durationLabel(meta.started_at, meta.ended_at) : null;
  const subtitle = meta
    ? [childName, new Date(meta.started_at).toLocaleString("he-IL"), duration]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <PageHeader
        title={tutorName ? `שיחה עם ${tutorName}` : "תמליל שיחה"}
        description={subtitle}
        back={back}
      />

      {transcriptFailed ? (
        <div className="flex flex-col gap-3">
          <Alert variant="destructive" role="alert">
            <AlertDescription>לא הצלחנו לטעון את התמליל. בדקו את החיבור ונסו שוב.</AlertDescription>
          </Alert>
          <Button size="touch" variant="outline" onClick={() => void load()}>
            <RotateCw aria-hidden />
            נסו שוב
          </Button>
        </div>
      ) : transcript.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <MessageSquareOff className="size-8 opacity-40" aria-hidden />
            <p>אין תמליל זמין לשיחה הזו.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerList as="ol" className="flex flex-col gap-2" aria-label="תמליל השיחה">
          {transcript.map((m, i) => {
            const isTutor = m.role === "assistant";
            return (
              <StaggerItem
                key={i}
                index={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  // RTL: the tutor speaks from the start (right) edge, the child from the end.
                  isTutor
                    ? "me-auto bg-muted text-foreground"
                    : "ms-auto bg-primary text-primary-foreground",
                )}
              >
                {/* Speaker is otherwise conveyed only by side + color. */}
                <span className="sr-only">
                  {isTutor ? `${tutorName || "החונך"}:` : `${childName || "הילד"}:`}{" "}
                </span>
                {m.content}
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
