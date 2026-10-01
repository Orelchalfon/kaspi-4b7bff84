import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bot, ChevronLeft, EyeOff, Eye, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StaggerItem, StaggerList } from "@/components/ui/stagger-list";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PERSONALITY_LABELS_HE, type TutorPersonality } from "@/lib/tutors";

export const Route = createFileRoute("/parent/tutors/")({
  component: TutorsList,
});

interface TutorRow {
  id: string;
  name: string;
  subject: string;
  topic: string;
  personality: TutorPersonality;
  active: boolean;
}

function TutorsList() {
  const { householdId } = useAuth();
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("tutors")
      .select("id, name, subject, topic, personality, active")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });
    setTutors((data ?? []) as TutorRow[]);
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    load();
  }, [load]);

  const inactiveCount = tutors.filter((t) => !t.active).length;
  const visibleTutors = showInactive ? tutors : tutors.filter((t) => t.active);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">חונכים</h1>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">חונכים</h1>
        <Button asChild size="touch">
          <Link to="/parent/tutors/new">
            <Plus aria-hidden />
            חונך חדש
          </Link>
        </Button>
      </div>

      {visibleTutors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Bot className="h-10 w-10 opacity-40" aria-hidden />
            {tutors.length === 0 ? (
              <>
                <p>עדיין לא יצרתם חונכים.</p>
                <Button asChild variant="link" className="mt-1 h-11">
                  <Link to="/parent/tutors/new">
                    צרו חונך ראשון
                    <ArrowLeft aria-hidden />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p>כל החונכים הוסרו.</p>
                <Button variant="link" className="mt-1 h-11" onClick={() => setShowInactive(true)}>
                  הצג חונכים שהוסרו ({inactiveCount})
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <StaggerList replayKey={String(showInactive)} className="flex flex-col gap-2">
          {visibleTutors.map((tutor, i) => (
            <StaggerItem key={tutor.id} index={i}>
              <Link
                to="/parent/tutors/$tutorId"
                params={{ tutorId: tutor.id }}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between py-4">
                    <span className={cn("flex items-center gap-2", !tutor.active && "opacity-60")}>
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="size-5" aria-hidden />
                      </span>
                      <span className="leading-tight">
                        <span className="block font-medium">{tutor.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {tutor.subject} · {PERSONALITY_LABELS_HE[tutor.personality]}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {!tutor.active && (
                        <Badge variant="secondary" className="font-medium">
                          לא פעיל
                        </Badge>
                      )}
                      {/* Forward in RTL points left. */}
                      <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      {inactiveCount > 0 && visibleTutors.length > 0 && (
        <Button
          variant="ghost"
          size="touch"
          className="w-full text-muted-foreground"
          aria-pressed={showInactive}
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {showInactive ? "הסתר חונכים שהוסרו" : `הצג גם חונכים שהוסרו (${inactiveCount})`}
        </Button>
      )}
    </div>
  );
}
