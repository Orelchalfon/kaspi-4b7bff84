import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedNumber({
  value,
  duration = 600,
  className,
  formatter,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (displayed === value) return;

    if (prefersReducedMotion()) {
      setDisplayed(value);
      fromRef.current = value;
      return;
    }

    fromRef.current = displayed;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = easeOutCubic(t);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplayed(t === 1 ? value : next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, displayed]);

  const rounded = Math.round(displayed);
  const text = formatter ? formatter(rounded) : `${rounded}`;
  return <span className={cn("tabular-nums", className)}>{text}</span>;
}
