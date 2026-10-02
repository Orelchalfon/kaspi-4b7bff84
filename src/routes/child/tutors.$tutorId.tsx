import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bot, Loader2, Mic, MicOff, PhoneOff, RotateCw } from "lucide-react";
import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { type TutorPersonality } from "@/lib/tutors";
import { cn } from "@/lib/utils";
import { loadSpline, onIdle, prefersSaveData, TUTOR_AVATAR_SCENE } from "@/lib/tutor-avatar";
import { mintTutorConversationToken } from "@/server/tutor-session";

// Heavy WebGL dependency - split out of the main bundle, prefetched from the
// tutors list (`prefetchTutorAvatar`) and mounted only while the page is idle.
const Spline = lazy(loadSpline);

// The SDK waits 3 s before connecting on Android by default (a Bluetooth audio-routing
// workaround). 500 ms keeps a margin for that; raise it if Android + Bluetooth earbuds
// start the call with no audio.
const CONNECTION_DELAY = { default: 0, android: 500, ios: 0 };

// Conversation tokens are short-lived and single-use; a prefetched one older than this
// is discarded and a fresh one minted on click.
const TOKEN_MAX_AGE_MS = 5 * 60 * 1000;

// A blocked network request or unsupported WebGL context is a realistic
// failure mode for a third-party CDN asset - fall back to the plain icon
// rather than breaking the whole session UI.
class SplineErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[tutor avatar] Spline scene failed to load", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function AvatarFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Bot className="h-12 w-12" aria-hidden />
    </div>
  );
}

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

type MicIssue = "denied" | "missing" | "unsupported";

type MintedToken = Awaited<ReturnType<typeof mintTutorConversationToken>>;

interface PrefetchedToken {
  promise: Promise<MintedToken | null>;
  mintedAt: number;
}

const MIC_ISSUE_COPY: Record<MicIssue, { title: string; body: string }> = {
  denied: {
    title: "אין גישה למיקרופון",
    body: "כדי לדבר עם החונך צריך לאשר גישה למיקרופון. לחצו על סמל המנעול ליד כתובת האתר, אשרו את המיקרופון ונסו שוב.",
  },
  missing: {
    title: "לא מצאנו מיקרופון",
    body: "חברו אוזניות עם מיקרופון או מיקרופון חיצוני ונסו שוב.",
  },
  unsupported: {
    title: "הדפדפן לא תומך במיקרופון",
    body: "נסו לפתוח את האתר בדפדפן אחר, כמו Chrome או Safari.",
  },
};

/**
 * Asks for the microphone up front so a blocked/missing mic gets a specific,
 * fixable message instead of a generic "couldn't start" after a session row exists.
 * The probe stream is released immediately; the voice SDK opens its own.
 */
async function checkMicrophone(): Promise<MicIssue | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return null;
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
    if (name === "NotAllowedError" || name === "SecurityError") return "denied";
    return "unsupported";
  }
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
        <OrbitalLoader message="טוען חונך..." />
      </div>
    );
  }

  if (phase === "invalid" || !tutor || !childProfileId || !householdId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="החונך לא זמין" back={{ to: "/child/tutors", label: "חזרה לחונכים" }} />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-base text-foreground">החונך הזה לא זמין כרגע.</p>
            <Button asChild size="touch" className="mt-4">
              <Link to="/child/tutors">חזרה לחונכים</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
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
  // Bridges the multi-second gap between the child finishing a turn and the
  // agent's TTS audio starting - driven by ElevenLabs' own `agent_typing`
  // signal (`onAgentTyping`) rather than inferring it from message roles.
  const [isThinking, setIsThinking] = useState(false);
  const [micIssue, setMicIssue] = useState<MicIssue | null>(null);
  // Whether the decorative 3D avatar may mount. Set only while idle, so its download and
  // WebGL compile never overlap connecting or a live call (main-thread audio work).
  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const prefetchedTokenRef = useRef<PrefetchedToken | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accessToken = session?.access_token;

  const mintToken = (token: string) =>
    mintTutorConversationToken({
      data: { tutorId: tutor.id },
      headers: { Authorization: `Bearer ${token}` },
    });

  // Mint the conversation token while the child is still reading the page, so the click
  // goes straight to the WebRTC handshake instead of waiting on our server + ElevenLabs.
  useEffect(() => {
    if (phase !== "idle" || !accessToken || prefetchedTokenRef.current) return;
    prefetchedTokenRef.current = {
      promise: mintToken(accessToken).catch((err: unknown) => {
        console.warn("[tutor session] token prefetch failed, will retry on click", err);
        return null;
      }),
      mintedAt: Date.now(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mintToken only closes over tutor.id
  }, [phase, accessToken, tutor.id]);

  useEffect(() => {
    if (phase !== "idle" || avatarEnabled || prefersSaveData()) return;
    return onIdle(() => setAvatarEnabled(true));
  }, [phase, avatarEnabled]);

  /** Hands out the prefetched token once (single-use), or mints a fresh one. */
  const takeToken = async (token: string): Promise<MintedToken> => {
    const prefetched = prefetchedTokenRef.current;
    prefetchedTokenRef.current = null;
    if (prefetched && Date.now() - prefetched.mintedAt < TOKEN_MAX_AGE_MS) {
      const result = await prefetched.promise;
      if (result) return result;
    }
    return mintToken(token);
  };

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
      if (startedAtRef.current !== null) {
        console.info(
          `[tutor session] connected ${Math.round(performance.now() - startedAtRef.current)}ms after click`,
        );
      }
      const sid = sessionIdRef.current;
      if (sid) {
        await supabase
          .from("tutor_sessions")
          .update({ elevenlabs_conversation_id: conversationId })
          .eq("id", sid);
      }
    },
    onDisconnect: async (details) => {
      // A normal hang-up lands here too, so this is informational, not an error.
      console.info("[tutor session] disconnected", details);
      setPhase("ended");
      setIsThinking(false);
      await finishSession("completed");
    },
    onMessage: ({ message, role }) => {
      if (role === "agent" && startedAtRef.current !== null) {
        console.info(
          `[tutor session] first agent message ${Math.round(performance.now() - startedAtRef.current)}ms after click`,
        );
        startedAtRef.current = null;
      }
      setTranscript((prev) => [
        ...prev,
        { role: role === "agent" ? "assistant" : "user", content: message },
      ]);
    },
    onAgentTyping: ({ is_typing }) => {
      setIsThinking(is_typing);
    },
    onError: async (message, context) => {
      console.error("[tutor session]", message, context);
      toast.error("אירעה שגיאה בשיחה");
      setPhase("ended");
      setIsThinking(false);
      await finishSession("failed");
    },
  });

  const startCall = async () => {
    if (!accessToken) {
      toast.error("יש להתחבר מחדש");
      return;
    }
    startedAtRef.current = performance.now();
    setMicIssue(null);
    setPhase("connecting");
    const issue = await checkMicrophone();
    if (issue) {
      setMicIssue(issue);
      setPhase("idle");
      return;
    }
    setTranscript([]);
    sessionIdRef.current = null;
    // The session row and the token don't depend on each other - one round-trip, not two.
    const [insertResult, tokenResult] = await Promise.allSettled([
      supabase
        .from("tutor_sessions")
        .insert({
          household_id: householdId,
          tutor_id: tutor.id,
          child_id: childId,
          status: "active",
        })
        .select("id")
        .single(),
      takeToken(accessToken),
    ]);

    const created = insertResult.status === "fulfilled" ? insertResult.value.data : null;
    if (created) sessionIdRef.current = created.id;

    if (!created || tokenResult.status === "rejected") {
      console.error(
        "[start tutor session]",
        insertResult.status === "rejected" ? insertResult.reason : insertResult.value.error,
        tokenResult.status === "rejected" ? tokenResult.reason : null,
      );
      // A row that was created but can never connect shouldn't linger as "active".
      if (created) await finishSession("failed");
      sessionIdRef.current = null;
      toast.error("לא הצלחנו להתחיל את השיחה. נסו שוב.");
      setPhase("idle");
      return;
    }

    conversation.startSession({
      conversationToken: tokenResult.value.conversationToken,
      connectionType: "webrtc",
      overrides: tokenResult.value.overrides,
      connectionDelay: CONNECTION_DELAY,
    });
  };

  const isSpeaking = conversation.isSpeaking;
  const reducedMotion = useReducedMotion();

  // Safety nets so the "thinking" indicator can never get stuck true across
  // a session, even if an `agent_typing: false` event is missed.
  useEffect(() => {
    if (isSpeaking) {
      setIsThinking(false);
    }
  }, [isSpeaking]);

  useEffect(() => {
    if (phase !== "active") {
      setIsThinking(false);
    }
  }, [phase]);

  const isThinkingVisible = phase === "active" && isThinking && !isSpeaking;

  // One polite live region narrates every state change of the call.
  const statusText =
    phase === "connecting"
      ? "מתחבר לחונך..."
      : phase === "ended"
        ? "השיחה הסתיימה"
        : phase === "active"
          ? isSpeaking
            ? "החונך מדבר"
            : isThinkingVisible
              ? "החונך חושב..."
              : conversation.isMuted
                ? "המיקרופון מושתק"
                : "השיחה פעילה. אפשר לדבר."
          : "";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">שיחה עם {tutor.name}</h1>
      <header className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="touch" className="-ms-3 text-muted-foreground">
          <Link to="/child/tutors">
            {/* In RTL "back" points right. */}
            <ArrowRight aria-hidden />
            חזרה
          </Link>
        </Button>
        <div className="text-center">
          <div className="text-sm font-medium text-foreground">{tutor.name}</div>
          <div className="text-xs text-muted-foreground">{tutor.subject}</div>
        </div>
        <span className="w-11" aria-hidden />
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <div className="relative flex h-48 w-48 items-center justify-center">
            {/* Speaking glow - the scene itself keeps orbiting regardless of
                speaking state, so the "it's talking" cue comes from this
                pulse instead of anything inside the scene. */}
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full bg-primary/25 blur-2xl"
              animate={
                reducedMotion
                  ? { opacity: 0.25 }
                  : isSpeaking
                    ? { opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.92] }
                    : isThinkingVisible
                      ? { opacity: [0.15, 0.32, 0.15], scale: [0.95, 1.03, 0.95] }
                      : { opacity: 0.2, scale: 0.95 }
              }
              transition={{
                duration: isSpeaking ? 1 : 1.8,
                repeat: (isSpeaking || isThinkingVisible) && !reducedMotion ? Infinity : 0,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="relative h-40 w-40 overflow-hidden rounded-full bg-primary/10 text-primary"
              animate={
                reducedMotion ? { scale: 1 } : isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }
              }
              transition={{
                duration: 0.9,
                repeat: isSpeaking && !reducedMotion ? Infinity : 0,
                ease: "easeInOut",
              }}
            >
              {avatarEnabled ? (
                <SplineErrorBoundary fallback={<AvatarFallback />}>
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center">
                        <OrbitalLoader size="sm" />
                      </div>
                    }
                  >
                    <Spline
                      scene={TUTOR_AVATAR_SCENE}
                      style={{
                        width: "170%",
                        height: "170%",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </Suspense>
                </SplineErrorBoundary>
              ) : (
                <AvatarFallback />
              )}
            </motion.div>
            <span className="sr-only" role="status" aria-live="polite">
              {statusText}
            </span>
          </div>

          {isThinkingVisible && (
            <p className="text-xs font-medium text-muted-foreground" aria-hidden>
              החונך חושב...
            </p>
          )}

          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{tutor.name}</p>
            <p className="text-xs text-muted-foreground">{tutor.topic}</p>
          </div>

          {micIssue && phase === "idle" && (
            <Alert variant="destructive" className="w-full max-w-xs text-start">
              <MicOff aria-hidden />
              <AlertTitle>{MIC_ISSUE_COPY[micIssue].title}</AlertTitle>
              <AlertDescription>{MIC_ISSUE_COPY[micIssue].body}</AlertDescription>
            </Alert>
          )}

          {phase === "idle" && (
            <Button size="touch" className="min-h-12 w-full max-w-xs" onClick={startCall}>
              {micIssue ? <RotateCw aria-hidden /> : <Mic aria-hidden />}
              {micIssue ? "נסו שוב" : "התחל שיחה"}
            </Button>
          )}

          {phase === "connecting" && (
            <Button size="touch" className="min-h-12 w-full max-w-xs" disabled>
              <Loader2 className="animate-spin" aria-hidden />
              מתחבר...
            </Button>
          )}

          {phase === "active" && (
            <div className="flex w-full max-w-xs gap-2">
              <Button
                variant="outline"
                size="touch"
                className="min-h-12 flex-1"
                aria-pressed={conversation.isMuted}
                onClick={() => conversation.setMuted(!conversation.isMuted)}
              >
                {conversation.isMuted ? <MicOff aria-hidden /> : <Mic aria-hidden />}
                {conversation.isMuted ? "הפעל מיקרופון" : "השתק"}
              </Button>
              <Button
                variant="destructive"
                size="touch"
                className="min-h-12 flex-1"
                onClick={() => conversation.endSession()}
              >
                <PhoneOff aria-hidden />
                סיים שיחה
              </Button>
            </div>
          )}

          {phase === "ended" && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">השיחה הסתיימה.</p>
              <Button asChild size="touch">
                <Link to="/child/tutors">חזרה לחונכים</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {transcript.length > 0 && (
        <section aria-labelledby="transcript-heading" className="flex flex-col gap-2">
          <h2 id="transcript-heading" className="text-sm font-semibold text-muted-foreground">
            תמליל
          </h2>
          {/* role="log": new lines are announced politely as the conversation goes. */}
          <div role="log" aria-live="polite" className="flex flex-col gap-2">
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
                <span className="sr-only">
                  {m.role === "assistant" ? `${tutor.name}:` : "אני:"}{" "}
                </span>
                {m.content}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
