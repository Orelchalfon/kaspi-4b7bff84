# Checklist — React component splitting

Use this when deciding whether and how to break up a large or mixed-concern component.
Split by **responsibility**, never by raw line count.

## Responsibility seams (split when ≥2 of these live in one file)

- **Layout / page shell** — the route-level container, headers, nav, grid.
- **Data fetching** — `useQuery`/`useMutation`, Supabase calls, loaders. Pull into a hook
  (`use-<feature>-data.ts`) so the view becomes presentational.
- **Form logic** — `react-hook-form` setup, `zodResolver`, submit handler → `use-<x>-form.ts`
  or a dedicated `<XForm>` component.
- **Table / list rendering** — row mapping, sorting, pagination → `<XTable>` + `<XRow>`.
- **Modal / dialog** — each Radix/shadcn `Dialog` with its own state → `<XDialog>`.
- **Card / item** — repeated card markup → `<XCard>` taking typed props.
- **Custom hook** — any reusable stateful logic (counters, toggles, polling).
- **Validation / schema** — zod schemas → `schema.ts` or co-located `<feature>.schema.ts`.
- **Constants / config** — magic strings, option lists, label maps → `constants.ts`.
- **Types** — shared interfaces/types → `types.ts`.
- **Utilities** — pure helpers → `utils.ts` (or reuse `src/lib/*`).

## Placement rules

- Keep components **close to usage**. Co-locate inside the feature/route folder until a
  second feature actually imports it — only then promote to a shared location.
- Prefer **feature-based folders** over global `components/` dumping grounds.
- Use **named exports**. Avoid default exports for components.
- **Avoid barrel files** (`index.ts` re-exports) unless the repo already uses them
  consistently — they hurt tree-shaking and create import cycles.

## Presentational vs container

- View components should mostly take props and render. Push effects, fetching, and
  mutations into hooks or a thin container.
- A component doing fetching **and** form **and** layout is the #1 split candidate.

## When to extract a hook

- The same `useState`/`useEffect` cluster appears in two places.
- Stateful logic is testable in isolation (timers, derived state, subscriptions).
- The component body is dominated by effect wiring rather than JSX.
- Existing examples in this repo: `src/hooks/use-auth.tsx` and the counting/step-cycling hooks.

## TanStack Start server/client boundary (this repo, **not** Next.js)

- Server-only code lives in `*.server.ts(x)`. `importProtection` in `vite.config.ts` blocks
  importing those from client modules — keep the split clean.
- The one server function is `src/server/create-child.ts` (admin SDK). Don't move
  service-role logic into client components.
- There is no Next.js `"use client"` directive here; don't introduce one.

## Anti-patterns to avoid

- **Over-abstraction**: don't create a generic `<DataTable<T>>` for a single two-column list.
- **Premature shared folders**: one consumer ≠ shared.
- **Prop drilling** more than ~2 levels — lift to context or a hook instead.
- Splitting that **changes public behavior** or breaks RTL/Hebrew (see `rtl-hebrew-review.md`).

## After splitting

- Update all imports; confirm no orphaned/dead files remain.
- Run `pnpm exec tsc --noEmit` and `pnpm lint`.
- Preserve exact props, styling classes, and rendered output.
