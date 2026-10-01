import { ArrowLeftRight, Coins, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";

interface SavingsHeroProps {
  savingsBalance: number;
  walletBalance: number;
  /** Household auto-savings % (0 = no automatic transfer). */
  savingsPct: number;
  /** Opens the move-to-savings dialog. */
  onMove: () => void;
}

/** The blue savings-pot card: savings total, auto-savings note, wallet chip + move action. */
export function SavingsHero({
  savingsBalance,
  walletBalance,
  savingsPct,
  onMove,
}: SavingsHeroProps) {
  return (
    <Card className="bg-primary text-primary-foreground shadow-md">
      <CardContent className="space-y-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <PiggyBank className="h-4 w-4" aria-hidden />
            <span>החיסכון שלי</span>
          </div>
          <p className="flex items-center gap-2 text-4xl font-bold tabular-nums">
            <Coins className="size-8 text-coin" aria-hidden />
            <span aria-hidden>
              <AnimatedNumber value={savingsBalance} />
            </span>
            <span className="sr-only">{`${savingsBalance} מטבעות`}</span>
          </p>
          <p className="text-xs opacity-80">
            {savingsPct > 0
              ? `מועבר אוטומטית: ${savingsPct}% מכל תגמול`
              : "כרגע אין העברה אוטומטית מהתגמולים"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 text-sm">
            <Coins className="size-4 text-coin" aria-hidden />
            <span>בארנק</span>
            <span aria-hidden>
              <AnimatedNumber value={walletBalance} className="font-semibold" />
            </span>
            <span className="sr-only">{`${walletBalance} מטבעות`}</span>
          </span>
          <Button
            size="touch"
            variant="secondary"
            onClick={onMove}
            disabled={walletBalance <= 0}
            className="transition-transform active:scale-[0.97]"
          >
            <ArrowLeftRight aria-hidden />
            העבר לחיסכון
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
