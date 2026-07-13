import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, ChevronLeft, Plus } from "lucide-react";
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">חונכים</h1>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">חונכים</h1>
        <Link to="/parent/tutors/new">
          <Button size="sm" className="min-h-10">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="ms-1.5">חונך חדש</span>
          </Button>
        </Link>
      </div>

      {tutors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Bot className="h-10 w-10 opacity-40" aria-hidden />
            <p>עדיין לא יצרתם חונכים.</p>
            <Link to="/parent/tutors/new">
              <Button variant="link" className="mt-1">
                צרו חונך ראשון
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tutors.map((tutor) => (
            <Link key={tutor.id} to="/parent/tutors/$tutorId" params={{ tutorId: tutor.id }}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <span className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="leading-tight">
                      <span className="block font-medium">{tutor.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tutor.subject} · {PERSONALITY_LABELS_HE[tutor.personality]}
                        {!tutor.active && " · לא פעיל"}
                      </span>
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
