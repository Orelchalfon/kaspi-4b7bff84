import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getTutorSessionTranscript,
  type TutorTranscriptMessage,
} from "@/server/tutor-transcript";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/parent/tutors/$tutorId/sessions/$sessionId")({
  component: SessionTranscript,
});

interface SessionMeta {
  child_id: string;
  started_at: string;
  ended_at: string | null;
}

function SessionTranscript() {
  const { tutorId, sessionId } = Route.useParams();
  const { session } = useAuth();
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [childName, setChildName] = useState("");
  const [transcript, setTranscript] = useState<TutorTranscriptMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      const { data: sData } = await supabase
        .from("tutor_sessions")
        .select("child_id, started_at, ended_at")
        .eq("id", sessionId)
        .maybeSingle();

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
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        setTranscript(result.transcript);
      } catch (err) {
        console.error("[getTutorSessionTranscript]", err);
        toast.error("שגיאה בטעינת התמליל");
      }
      setLoading(false);
    })();
  }, [sessionId, session?.access_token]);

  if (loading) return <DetailSkeleton />;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <Link
        to="/parent/tutors/$tutorId"
        params={{ tutorId }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        חזרה לחונך
      </Link>

      {meta && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{childName}</span> ·{" "}
          {new Date(meta.started_at).toLocaleString("he-IL")}
        </div>
      )}

      {transcript.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            אין תמליל זמין לשיחה הזו.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transcript.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                m.role === "assistant"
                  ? "me-auto bg-muted text-foreground"
                  : "ms-auto bg-primary text-primary-foreground",
              )}
            >
              {m.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
