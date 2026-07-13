import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_VOICE_ID,
  PERSONALITY_LABELS_HE,
  TUTOR_PERSONALITIES,
  TUTOR_VOICES,
  type TutorPersonality,
} from "@/lib/tutors";

export const Route = createFileRoute("/parent/tutors/new")({
  component: NewTutor,
});

function NewTutor() {
  const { householdId, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [personality, setPersonality] = useState<TutorPersonality>("friendly");
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!householdId || !user) return;
    setError("");
    setLoading(true);

    const { error: insertError } = await supabase.from("tutors").insert({
      household_id: householdId,
      created_by: user.id,
      name,
      subject,
      topic,
      personality,
      voice_id: voiceId,
    });

    if (insertError) {
      console.error("[tutors.new] insert failed:", insertError);
      setError(
        import.meta.env.DEV ? `שגיאה ביצירת חונך: ${insertError.message}` : "שגיאה ביצירת חונך",
      );
      setLoading(false);
      return;
    }

    toast.success("החונך נוצר בהצלחה");
    navigate({ to: "/parent/tutors" });
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>חונך חדש</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="tutor-name">שם החונך</Label>
              <Input
                id="tutor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="מורה נועה"
                maxLength={60}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-subject">מקצוע</Label>
              <Input
                id="tutor-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="אנגלית"
                maxLength={60}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-topic">נושא השיחה</Label>
              <Textarea
                id="tutor-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="שיחון באנגלית לחיי היומיום"
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-personality">סגנון</Label>
              <Select
                value={personality}
                onValueChange={(v) => setPersonality(v as TutorPersonality)}
              >
                <SelectTrigger id="tutor-personality">
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
              <Label htmlFor="tutor-voice">קול</Label>
              <Select value={voiceId} onValueChange={setVoiceId}>
                <SelectTrigger id="tutor-voice">
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
            <Button type="submit" className="min-h-11 w-full" disabled={loading}>
              {loading ? "יוצר..." : "צור חונך"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
