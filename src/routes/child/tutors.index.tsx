import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, MessageCircle, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { ListSkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { prefetchTutorAvatar } from "@/lib/tutor-avatar";
import { PERSONALITY_LABELS_HE, type TutorPersonality } from "@/lib/tutors";

export const Route = createFileRoute("/child/tutors/")({
  component: ChildTutors,
});

interface TutorRow {
  id: string;
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
}

function ChildTutors() {
  const { householdId } = useAuth();
  // Warm the 3D avatar chunk while the child picks a tutor, so the session page has it cached.
  useEffect(() => prefetchTutorAvatar(), []);
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setLoadFailed(false);
    const { data, error } = await supabase
      .from("tutors")
      .select("id, name, subject, topic, personality")
      .eq("household_id", householdId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[child/tutors] load failed", error);
      setLoadFailed(true);
    } else {
      setTutors((data ?? []) as TutorRow[]);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <PageHeader title="חונך AI" icon={Bot} description="בחרו חונך והתחילו שיחת קול." />
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            אופס, לא הצלחנו לטעון את החונכים. בדקו את האינטרנט ונסו שוב.
          </AlertDescription>
        </Alert>
        <Button size="touch" variant="outline" onClick={() => void load()}>
          <RotateCw aria-hidden />
          נסו שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      {tutors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-base">ההורה עדיין לא הוסיף חונכים.</p>
            <p className="mt-1 text-sm">בקשו ממנו ליצור חונך חדש בלוח הבקרה.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tutors.map((tutor, i) => (
            <StaggerItem key={tutor.id} index={i}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Bot className="size-5" aria-hidden />
                    </span>
                    <div className="leading-tight">
                      <h2 className="text-lg font-semibold text-foreground">{tutor.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {tutor.subject} · {PERSONALITY_LABELS_HE[tutor.personality]}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{tutor.topic}</p>
                  <Button asChild size="touch" className="mt-auto w-full font-semibold">
                    <Link to="/child/tutors/$tutorId" params={{ tutorId: tutor.id }}>
                      <MessageCircle aria-hidden />
                      התחל שיחה
                      <span className="sr-only"> עם {tutor.name}</span>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
