import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";

export const Route = createFileRoute("/child/savings")({
  component: ChildSavings,
});

function ChildSavings() {
  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <PiggyBank className="h-12 w-12 opacity-40" aria-hidden />
          <p className="text-base">החיסכון יגיע בקרוב!</p>
          <p className="text-xs">בקרוב תוכלו להגדיר מטרות חיסכון ולעקוב אחרי ההתקדמות.</p>
        </CardContent>
      </Card>
    </div>
  );
}
