import * as React from "react";

import { cn } from "@/lib/utils";

interface AuthLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: {
    container: "size-20",
    title: "text-sm/tight font-medium",
    subtitle: "text-xs/relaxed",
    maxWidth: "max-w-48",
  },
  md: {
    container: "size-32",
    title: "text-base/snug font-semibold",
    subtitle: "text-sm/relaxed",
    maxWidth: "max-w-60",
  },
  lg: {
    container: "size-40",
    title: "text-lg/tight font-semibold",
    subtitle: "text-base/relaxed",
    maxWidth: "max-w-72",
  },
} as const;

// Each ring is a conic gradient in the brand blue, cut to a thin band by a radial mask.
const ringMask = (inner: number, outer: number) =>
  `radial-gradient(circle at 50% 50%, transparent ${inner}%, black ${inner + 2}%, black ${outer - 2}%, transparent ${outer}%)`;

const rings: { background: string; mask: string; opacity: number; animation: string }[] = [
  {
    background:
      "conic-gradient(from 0deg, transparent 0deg, var(--primary) 90deg, transparent 180deg)",
    mask: ringMask(35, 41),
    opacity: 0.8,
    animation: "animate-[spin_3s_linear_infinite]",
  },
  {
    background:
      "conic-gradient(from 0deg, transparent 0deg, var(--primary) 120deg, color-mix(in oklch, var(--primary) 50%, transparent) 240deg, transparent 360deg)",
    mask: ringMask(42, 50),
    opacity: 0.9,
    animation: "animate-[spin_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]",
  },
  {
    background:
      "conic-gradient(from 180deg, transparent 0deg, color-mix(in oklch, var(--primary) 60%, transparent) 45deg, transparent 90deg)",
    mask: ringMask(52, 58),
    opacity: 0.35,
    animation: "animate-[spin_4s_cubic-bezier(0.4,0,0.6,1)_infinite_reverse]",
  },
  {
    background:
      "conic-gradient(from 270deg, transparent 0deg, color-mix(in oklch, var(--ks-cyan-soft) 80%, var(--primary)) 20deg, transparent 40deg)",
    mask: ringMask(61, 64),
    opacity: 0.6,
    animation: "animate-[spin_3.5s_linear_infinite]",
  },
];

/**
 * Full-screen loader for post-authentication moments (finishing sign-up, resolving the
 * user's role, redirecting to their dashboard). Brand-blue concentric rings with a
 * breathing title. Pure CSS animation; stops under prefers-reduced-motion.
 */
export function AuthLoader({
  title = "מכינים את החשבון שלכם...",
  subtitle = "רגע אחד, אנחנו מסדרים הכול בשבילכם",
  size = "md",
  className,
  ...props
}: AuthLoaderProps) {
  const config = sizeConfig[size];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-8 p-8", className)}
      {...props}
    >
      <div
        aria-hidden
        className={cn(
          "relative animate-[auth-loader-breathe_4s_cubic-bezier(0.4,0,0.6,1)_infinite]",
          config.container,
        )}
      >
        {rings.map((r, i) => (
          <div
            key={i}
            className={cn("absolute inset-0 rounded-full", r.animation)}
            style={{
              background: r.background,
              mask: r.mask,
              WebkitMask: r.mask,
              opacity: r.opacity,
            }}
          />
        ))}
      </div>

      <div
        className={cn(
          "flex flex-col gap-2 text-center animate-in fade-in slide-in-from-bottom-3 [animation-delay:400ms] [animation-duration:800ms] [animation-fill-mode:both]",
          config.maxWidth,
        )}
      >
        <h1
          className={cn(
            config.title,
            "tracking-tight text-foreground animate-[auth-loader-fade_3s_ease-in-out_infinite]",
          )}
        >
          {title}
        </h1>
        <p className={cn(config.subtitle, "text-muted-foreground")}>{subtitle}</p>
      </div>
    </div>
  );
}
