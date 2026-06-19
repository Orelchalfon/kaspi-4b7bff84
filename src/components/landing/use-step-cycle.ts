import { useEffect, useState } from "react";

type StepCycleOptions = {
  /** Only advances while true; freezes (keeps current index) when false. */
  run: boolean;
  intervalMs?: number;
};

/**
 * Cyclic index that advances `(i + 1) % count` on an interval while `run` is true.
 * Pauses (retains the current step) when `run` flips false — e.g. off-screen or
 * reduced motion. Mirrors the looping pattern used by the Hero demo.
 */
export function useStepCycle(count: number, { run, intervalMs = 2200 }: StepCycleOptions): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!run || count <= 1) return;
    const id = setInterval(() => setIndex((prev) => (prev + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [run, count, intervalMs]);

  return index;
}
