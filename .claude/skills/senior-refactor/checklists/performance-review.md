# Checklist — Performance review

Optimize for **measured** wins. Do not scatter `memo`/`useMemo`/`useCallback` everywhere —
they add cost and noise when the render isn't a bottleneck.

## React render

- Add `React.memo` / `useMemo` / `useCallback` only when a component is expensive **and**
  re-renders often with stable inputs. React 19's compiler-friendly patterns reduce the
  need — prefer clean data flow first.
- Stable **list keys**: use a stable id, never the array index for dynamic lists.
- Avoid creating new object/array/function literals inline as props in hot render paths
  (they break memoization and trigger child re-renders).
- Lift derived calculations out of render when they're heavy; cheap math stays inline.

## Data & network

- **Avoid N+1 Supabase queries.** Batch with `.in(...)`, a join/`select` with embedded
  relations, or a single RPC instead of one query per row.
- Reuse **TanStack Query** cache: share query keys, set sensible `staleTime`, avoid
  duplicate fetches across sibling components. Prefer one query + prop-down over many.
- Compute wallet/savings/goal balances from a **single** `transactions` fetch per screen
  (filter in memory by `type`) rather than multiple round-trips.

## Bundle & assets

- Lazy-load heavy, rarely-first-paint routes/components (charts, editors).
- Watch the weight of `recharts`, `framer-motion`, `embla-carousel`, `react-day-picker` —
  import only what's used; avoid pulling a whole lib for one helper.
- `rollup-plugin-visualizer` is available — inspect the bundle before/after big changes.

## Loops & effects

- No expensive work inside `useEffect` that runs every render (check deps arrays).
- Debounce/throttle high-frequency handlers (scroll, input, resize).
- Avoid synchronous layout thrash in animation loops.

## Validation

- Confirm `pnpm build` succeeds and bundle size didn't regress meaningfully.
