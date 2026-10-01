import { Coins, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/animated-number";
import { Card, CardContent } from "@/components/ui/card";

interface BalanceHeroProps {
  value: number;
  label?: string;
  icon?: LucideIcon;
}

/**
 * The blue balance card shared by the child home and wallet screens. The counting
 * animation is hidden from assistive tech; screen readers get the final value once.
 */
export function BalanceHero({ value, label = "היתרה שלי", icon: Icon = Coins }: BalanceHeroProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="py-6 text-center">
        <p className="text-sm opacity-80">{label}</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
          <Icon className="size-8 text-coin" aria-hidden />
          <span aria-hidden>
            <AnimatedNumber value={value} />
          </span>
          <span className="sr-only">{`${value} מטבעות`}</span>
        </p>
      </CardContent>
    </Card>
  );
}
