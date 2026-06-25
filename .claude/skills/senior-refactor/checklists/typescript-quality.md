# Checklist — TypeScript quality

## Type safety

- **Eliminate `any`.** Prefer `unknown` + narrowing, or a precise type. Search for
  `: any`, `as any`, `<any>`, and `@ts-ignore`/`@ts-expect-error`.
- Replace unsafe casts (`as Foo`) with type guards or schema validation (zod) where the
  value crosses a trust boundary (network, Supabase, form input).
- Use **discriminated unions** for state machines and tagged payloads (e.g. tx `type`,
  task `status`) instead of loose strings + `if` chains.
- Use `satisfies` to validate object literals against a type without widening.
- Avoid non-null assertions (`!`) on values that can genuinely be null — handle the null.

## Reuse generated DB types

- `src/integrations/supabase/types.ts` is **generated** from the live DB. Reuse
  `Database["public"]["Tables"]["..."]["Row"]` / `Insert` / `Update` and RPC return types
  instead of redeclaring shapes by hand.
- After any schema change, regenerate types (Supabase MCP `generate_typescript_types` or
  `supabase gen types typescript --project-id flxhxmrtdqegfsupvvus`) so the codebase
  compiles against reality.

## Strictness & correctness

- Respect `tsconfig` strictness; don't loosen it to make errors disappear.
- Functions with multiple return paths should have a consistent, explicit return type.
- Prefer `const` + `as const` for literal option lists feeding union types.
- Type all component props; no implicit `any` props.

## Naming

- Names should reveal intent: `pendingTaskCount`, not `n`/`data2`.
- Booleans read as predicates: `isLoading`, `hasGoal`, `canDeposit`.
- Hooks start with `use`; event handlers `handleX`/`onX`.

## Validation gate

- `pnpm exec tsc --noEmit` must pass.
- `pnpm lint` (typescript-eslint) must pass — fix, don't suppress.
