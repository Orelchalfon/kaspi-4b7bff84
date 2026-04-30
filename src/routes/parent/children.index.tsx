import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users } from "lucide-react";
import { ListSkeleton } from "@/components/loading-skeletons";

export const Route = createFileRoute("/parent/children/")({
  component: ChildrenList,
});

interface ChildRow {
  id: string;
  display_name: string;
  user_id: string;
}

function ChildrenList() {
  const { householdId } = useAuth();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) return;
    supabase
      .from("child_profiles")
      .select("id, display_name, user_id")
      .eq("household_id", householdId)
      .then(({ data }) => {
        setChildren(data || []);
        setLoading(false);
      });
  }, [householdId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ילדים</h1>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Link to="/parent/children/new">
          <Button size="sm" className="min-h-10">
            <UserPlus className="h-4 w-4" aria-hidden />
            <span className="ms-1.5">ילד חדש</span>
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" aria-hidden />
            <p>עדיין לא הוספתם ילדים.</p>
            <Link to="/parent/children/new">
              <Button variant="link" className="mt-1">הוסיפו ילד ראשון</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="flex items-center justify-between py-4">
                <span className="flex items-center gap-2 font-medium">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {child.display_name.charAt(0)}
                  </span>
                  {child.display_name}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
