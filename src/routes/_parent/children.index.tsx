import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_parent/children/")({
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
    return <div className="animate-pulse text-muted-foreground">טוען...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Link to="/parent/children/new">
          <Button size="sm">+ ילד חדש</Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>עדיין לא הוספתם ילדים.</p>
            <Link to="/parent/children/new">
              <Button variant="link" className="mt-2">הוסיפו ילד ראשון →</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="flex items-center justify-between py-4">
                <span className="font-medium">{child.display_name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
