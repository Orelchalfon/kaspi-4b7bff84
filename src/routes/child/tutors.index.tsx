import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ListSkeleton } from "@/components/loading-skeletons";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    supabase
      .from("tutors")
      .select("id, name, subject, topic, personality")
      .eq("household_id", householdId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTutors((data ?? []) as TutorRow[]);
        setLoading(false);
      });
  }, [householdId]);

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Bot className="h-6 w-6 text-primary" aria-hidden />
          חונך AI
        </h1>
        <p className="text-sm text-muted-foreground">בחרו חונך והתחילו שיחת קול.</p>
      </header>

      {tutors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-base">ההורה עדיין לא הוסיף חונכים.</p>
            <p className="mt-1 text-sm">בקשו ממנו ליצור חונך חדש בלוח הבקרה.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tutors.map((tutor) => (
            <li key={tutor.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="leading-tight">
                      <p className="text-lg font-semibold text-foreground">{tutor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tutor.subject} · {PERSONALITY_LABELS_HE[tutor.personality]}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{tutor.topic}</p>
                  <Link
                    to="/child/tutors/$tutorId"
                    params={{ tutorId: tutor.id }}
                    className="mt-auto inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    התחל שיחה
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
