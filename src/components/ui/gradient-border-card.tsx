import * as React from "react";

import { cn } from "@/lib/utils";

interface GradientBorderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Classes for the inner glass surface (padding, alignment). */
  contentClassName?: string;
}

/**
 * Glassmorphism card framed by an endlessly rotating gradient border
 * (grayish-white → silver → brand blue). The frame is a 2px padding ring painted
 * by `.gradient-border-frame` in styles.css; the inner surface is frosted glass.
 * Animation stops automatically under prefers-reduced-motion (global rule).
 */
const GradientBorderCard = React.forwardRef<HTMLDivElement, GradientBorderCardProps>(
  ({ className, contentClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "gradient-border-frame relative rounded-3xl p-[2px] shadow-[0_24px_64px_-24px] shadow-primary/35",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative h-full rounded-[calc(1.5rem-2px)] bg-card/75 backdrop-blur-xl",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  ),
);
GradientBorderCard.displayName = "GradientBorderCard";

export { GradientBorderCard };
