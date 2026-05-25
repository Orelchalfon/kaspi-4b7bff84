import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";

interface CoinAmountProps {
  value: number;
  signed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "success" | "muted" | "primary" | "destructive";
  animate?: boolean;
  className?: string;
  iconClassName?: string;
}

const sizeMap = {
  sm: { text: "text-sm", icon: "h-3.5 w-3.5" },
  md: { text: "text-base", icon: "h-4 w-4" },
  lg: { text: "text-xl", icon: "h-5 w-5" },
  xl: { text: "text-4xl", icon: "h-8 w-8" },
};

const toneMap = {
  default: "text-coin-foreground",
  success: "text-success",
  muted: "text-muted-foreground",
  primary: "text-primary-foreground",
  destructive: "text-destructive",
};

export function CoinAmount({
  value,
  signed = false,
  size = "md",
  tone = "default",
  animate = false,
  className,
  iconClassName,
}: CoinAmountProps) {
  const sizes = sizeMap[size];
  const format = (n: number) => (signed && n > 0 ? `+${n}` : `${n}`);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold tabular-nums",
        sizes.text,
        toneMap[tone],
        className,
      )}
      aria-label={`${value} מטבעות`}
    >
      <Coins className={cn(sizes.icon, "text-coin", iconClassName)} aria-hidden />
      {animate ? (
        <AnimatedNumber value={value} formatter={format} />
      ) : (
        <span>{format(value)}</span>
      )}
    </span>
  );
}