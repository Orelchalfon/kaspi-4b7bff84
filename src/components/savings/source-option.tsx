import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/utils";

export function SourceOption({
  active,
  disabled,
  label,
  balance,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  balance: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1.5 text-sm transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        disabled && "opacity-60",
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="text-[11px] tabular-nums opacity-70">
        זמין <AnimatedNumber value={balance} />
      </span>
    </button>
  );
}
