import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const orbitalLoaderVariants = cva("flex items-center justify-center gap-3", {
  variants: {
    messagePlacement: {
      bottom: "flex-col",
      top: "flex-col-reverse",
      // Logical: "end" sits after the spinner in reading order (left of it in RTL).
      end: "flex-row",
      start: "flex-row-reverse",
    },
    size: {
      sm: "[--orbital-size:2rem]",
      md: "[--orbital-size:4rem]",
      lg: "[--orbital-size:5rem]",
    },
  },
  defaultVariants: {
    messagePlacement: "bottom",
    size: "md",
  },
});

export interface OrbitalLoaderProps extends React.ComponentProps<"div"> {
  /** Visible message; also announced to screen readers. Defaults to an sr-only "טוען". */
  message?: string;
  /** @default "bottom" */
  messagePlacement?: "top" | "bottom" | "start" | "end";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

const ring = "absolute rounded-full border-2 border-transparent border-t-primary";

/**
 * Main in-app loader: three counter-rotating rings in the brand blue. Pure CSS
 * animation (no framer-motion), so it stops under the global prefers-reduced-motion
 * rule and is safe inside LazyMotion-strict trees.
 */
export function OrbitalLoader({
  className,
  message,
  messagePlacement,
  size,
  ...props
}: OrbitalLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(orbitalLoaderVariants({ messagePlacement, size }), className)}
      {...props}
    >
      <div aria-hidden className="relative size-(--orbital-size)">
        <div className={cn(ring, "inset-0 animate-[spin_1s_linear_infinite]")} />
        <div
          className={cn(
            ring,
            "inset-[12.5%] border-t-primary/70 animate-[spin_1.5s_linear_infinite_reverse]",
          )}
        />
        <div
          className={cn(
            ring,
            "inset-[25%] border-t-primary/45 animate-[spin_0.8s_linear_infinite]",
          )}
        />
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : (
        <span className="sr-only">טוען</span>
      )}
    </div>
  );
}
