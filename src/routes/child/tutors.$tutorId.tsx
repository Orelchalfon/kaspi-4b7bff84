import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { mintTutorSignedUrl } from "@/server/tutor-session";
import { type TutorPersonality } from "@/lib/tutors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/child/tutors/$tutorId")({
  component: ChildTutorSessionPage,
});

type Phase = "loading" | "invalid" | "idle" | "connecting" | "active" | "ended";

interface TutorRow {
  id: string;
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  active: boolean;
}

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

function ChildTutorSessionPage() {
  const { tutorId } = Route.useParams();
  const { householdId, childProfileId } = useAuth();
  const [tutor, setTutor] = useState<TutorRow | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const { data } = await supabase
        .from("tutors")
        .select("id, name, subject, topic, personality, active")
        .eq("id", tutorId)
        .maybeSingle();
      if (!data || !data.active) {
        setPhase("invalid");
        return;
      }
      setTutor(data as TutorRow);
      setPhase("idle");
    })();
  }, [householdId, tutorId]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">טוען חונך...</div>
      </div>
    );
  }

  if (phase === "invalid" || !tutor || !childProfileId || !householdId) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-base text-foreground">החונך הזה לא זמין כרגע.</p>
          <Link
            to="/child/tutors"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה לחונכים
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ConversationProvider>
      <TutorSession tutor={tutor} childId={childProfileId} householdId={householdId} />
    </ConversationProvider>
  );
}

function TutorSession({
  tutor,
  childId,
  householdId,
}: {
  tutor: TutorRow;
  childId: string;
  householdId: string;
}) {
  const { session } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const finishSession = async (status: "completed" | "failed") => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await supabase
      .from("tutor_sessions")
      .update({
        ended_at: new Date().toISOString(),
        status,
        transcript: transcriptRef.current as unknown as Json,
        transcript_source: "client",
      })
      .eq("id", sid);
  };

  const conversation = useConversation({
    onConnect: async ({ conversationId }) => {
      setPhase("active");
      const sid = sessionIdRef.current;
      if (sid) {
        await supabase
          .from("tutor_sessions")
          .update({ elevenlabs_conversation_id: conversationId })
          .eq("id", sid);
      }
    },
    onDisconnect: async () => {
      setPhase("ended");
      await finishSession("completed");
    },
    onMessage: ({ message, role }) => {
      setTranscript((prev) => [
        ...prev,
        { role: role === "agent" ? "assistant" : "user", content: message },
      ]);
    },
    onError: async (message) => {
      console.error("[tutor session]", message);
      toast.error("אירעה שגיאה בשיחה");
      setPhase("ended");
      await finishSession("failed");
    },
  });

  const startCall = async () => {
    if (!session?.access_token) {
      toast.error("יש להתחבר מחדש");
      return;
    }
    setPhase("connecting");
    setTranscript([]);
    try {
      const { data: created, error } = await supabase
        .from("tutor_sessions")
        .insert({
          household_id: householdId,
          tutor_id: tutor.id,
          child_id: childId,
          status: "active",
        })
        .select("id")
        .single();
      if (error || !created) throw error ?? new Error("Failed to create session");
      sessionIdRef.current = created.id;

      const result = await mintTutorSignedUrl({
        data: { tutorId: tutor.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      conversation.startSession({ signedUrl: result.signedUrl, overrides: result.overrides });
    } catch (err) {
      console.error("[start tutor session]", err);
      toast.error("לא הצלחנו להתחיל את השיחה. נסו שוב.");
      setPhase("idle");
    }
  };

  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          to="/child/tutors"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          חזרה
        </Link>
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{tutor.name}</div>
          <div className="text-[11px] text-muted-foreground">{tutor.subject}</div>
        </div>
        <span className="w-9" aria-hidden />
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <motion.div
            className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 text-primary"
            animate={isSpeaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
          >
            <Bot className="h-12 w-12" aria-hidden />
          </motion.div>

          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{tutor.name}</p>
            <p className="text-xs text-muted-foreground">{tutor.topic}</p>
          </div>

          {phase === "idle" && (
            <Button className="min-h-12 w-full max-w-xs" onClick={startCall}>
              התחל שיחה
            </Button>
          )}

          {phase === "connecting" && (
            <Button className="min-h-12 w-full max-w-xs" disabled>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="ms-1.5">מתחבר...</span>
            </Button>
          )}

          {phase === "active" && (
            <div className="flex w-full max-w-xs gap-2">
              <Button
                variant="outline"
                className="min-h-12 flex-1"
                onClick={() => conversation.setMuted(!conversation.isMuted)}
              >
                {conversation.isMuted ? (
                  <MicOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden />
                )}
                <span className="ms-1.5">{conversation.isMuted ? "הפעל מיקרופון" : "השתק"}</span>
              </Button>
              <Button
                variant="destructive"
                className="min-h-12 flex-1"
                onClick={() => conversation.endSession()}
              >
                <PhoneOff className="h-4 w-4" aria-hidden />
                <span className="ms-1.5">סיים שיחה</span>
              </Button>
            </div>
          )}

          {phase === "ended" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">השיחה הסתיימה.</p>
              <Link
                to="/child/tutors"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                חזרה לחונכים
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {transcript.length > 0 && (
        <section aria-label="תמליל השיחה" className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">תמליל</h2>
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
        </section>
      )}
    </div>
  );
}
