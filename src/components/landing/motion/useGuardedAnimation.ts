import { useReducedMotion, type Variants } from "framer-motion";

export function useGuardedVariants<T extends Variants>(variants: T): T {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  const flat = Object.fromEntries(
    Object.entries(variants).map(([k, v]) => [
      k,
      { ...(v as object), transition: { duration: 0 } },
    ]),
  ) as T;
  return flat;
}

export function useShouldAnimate(): boolean {
  const reduce = useReducedMotion();
  return !reduce;
}
