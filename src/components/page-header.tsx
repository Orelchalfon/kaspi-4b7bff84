import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Optional leading icon rendered before the title (RTL: on the right). */
  icon?: LucideIcon;
  /** Back link above the title. In RTL "back" points right, hence ArrowRight. */
  back?: { to: string; label?: string };
  /** Page-level actions (e.g. "new" button), placed at the inline end. */
  actions?: ReactNode;
  /** Visually hide the title while keeping it as the page's h1 for screen readers. */
  srOnlyTitle?: boolean;
  className?: string;
}

/**
 * Consistent page heading: every route gets exactly one h1, an optional back link
 * (44px touch target) and an actions slot.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  back,
  actions,
  srOnlyTitle = false,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      {back && (
        <Button
          asChild
          variant="ghost"
          size="touch"
          className="-ms-3 self-start text-muted-foreground"
        >
          <Link to={back.to}>
            <ArrowRight aria-hidden />
            {back.label ?? "חזרה"}
          </Link>
        </Button>
      )}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          srOnlyTitle && !actions && "sr-only",
        )}
      >
        <div className={cn("min-w-0", srOnlyTitle && "sr-only")}>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            {Icon && <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />}
            {title}
          </h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
