import { RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * A failed page/section load: destructive alert + a 44px "נסו שוב" retry.
 * Render it in place of the content (never an empty state) so a network error
 * isn't mistaken for "no data".
 */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive" role="alert">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button size="touch" variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden />
        נסו שוב
      </Button>
    </div>
  );
}
