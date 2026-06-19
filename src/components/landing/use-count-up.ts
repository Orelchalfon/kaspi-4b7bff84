import { animate } from "framer-motion";
import { useEffect, useState } from "react";

import { easeOutSoft } from "./motion/variants";

type CountUpOptions = {
  /** When false, the hook returns `target` immediately (reduced motion / not triggered). */
  play: boolean;
  /** Value to animate from when `play` flips true. Defaults to 0. */
  from?: number;
  durationMs?: number;
};

/**
 * Animates an integer from `from` up to `target` whenever `play` becomes true.
 * Uses framer-motion's imperative `animate()` (allowed under `LazyMotion strict`
 * since it isn't the `motion` component factory). Falls back to the final value
 * instantly when `play` is false so reduced-motion users see a readable number.
 */
export function useCountUp(
  target: number,
  { play, from = 0, durationMs = 800 }: CountUpOptions,
): number {
  const [value, setValue] = useState(play ? from : target);

  useEffect(() => {
    if (!play) {
      setValue(target);
      return;
    }
    const controls = animate(from, target, {
      duration: durationMs / 1000,
      ease: easeOutSoft,
      onUpdate: (latest) => setValue(Math.round(latest)),
    });
    return () => controls.stop();
  }, [play, from, target, durationMs]);

  return value;
}
