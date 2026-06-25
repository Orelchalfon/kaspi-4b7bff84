---
name: senior-refactor
description: >-
  Senior-level, safety-first codebase cleanup and refactor workflow. Use when the user wants
  to organize, clean up, split large files, reduce file size, untangle mixed concerns, extract
  hooks/components/types/utils, or optimize a React / TanStack-Start / Next.js / TypeScript /
  Tailwind / Supabase codebase. Invoke as `/senior-refactor audit|plan|execute|review-only`.
---

# Senior Refactor

A safety-first workflow to audit, plan, and execute a senior-level cleanup of this codebase.
Runs in one of four modes selected by `$ARGUMENTS`.

**Mode = `$ARGUMENTS`.** If empty, default to **`audit`**. Recognized:
`audit` · `plan` · `execute` · `review-only`.

```
/senior-refactor audit          # understand the codebase, produce findings
/senior-refactor plan           # turn findings into a phased plan
/senior-refactor execute        # apply ONE reviewable batch (then validate)
/senior-refactor review-only    # run all checklists read-only, no edits
```

Detailed rules live in `checklists/` — read the relevant ones rather than inlining their
content. Specialized work can be delegated to the project subagents (see Routing).

---

## 0. Safety rules — non-negotiable, apply in every mode

1. **Inspect before acting.** Read the actual repo structure and the target files first.
   Never rewrite the project blindly or by line count alone.
2. **Check `git status` before any edit.** If the working tree has uncommitted changes,
   **warn the user and ask** before touching risky files. Don't bury their work in a refactor diff.
3. **Small, reviewable change-groups.** One logical batch at a time. Prefer clean diffs over speed.
4. **No deletions until safe.** Don't delete/replace a file until every replacement import is
   confirmed wired up **and** validation passes.
5. **No public-behavior changes** unless explicitly requested. Preserve rendered output,
   props, routes, styling, RTL, and Hebrew copy.
6. **No new dependencies** without a strong, stated reason and user confirmation.
7. **Never touch Supabase schema, RLS, or RPCs** without an explicit ask + confirmation — the
   DB is shared with the mobile app.
8. When unsure whether a change is behavior-affecting, **stop and ask**.

---

## 1. Repo context (auto-detected; confirm each run)

This repo (`kaspii-web`) is the expected target; detect rather than assume:

- **Framework:** TanStack Start (file-based routing in `src/routes/`, SSR-able), React 19.
  **Not Next.js** — there is no `"use client"`; server-only code lives in `*.server.ts`.
- **Styling:** Tailwind v4 (CSS-first in `src/styles.css`, no `tailwind.config.js`); shadcn/Radix
  primitives in `src/components/ui/*`. **RTL + Hebrew** throughout.
- **Backend:** Supabase only (`flxhxmrtdqegfsupvvus`). Money via SECURITY DEFINER RPCs.
- **Package manager:** pnpm (only).
- **Validation commands:**
  - typecheck → `pnpm exec tsc --noEmit` (no `typecheck` script)
  - lint → `pnpm lint`
  - unit tests → `pnpm test`
  - build → `pnpm build`
  - **e2e → `pnpm test:e2e` is the USER's to run.** It hits the real Supabase project and
    fails from this shell (Windows TLS interception). Do **not** run it automatically.

---

## 2. Mode: `audit`

Goal: understand the codebase and surface the highest-impact, safest refactors. **Read-only.**

Steps:

1. Detect framework + package manager; read `package.json`, `tsconfig*`, eslint/prettier
   config, `src/routes/` structure, entry points, and `CLAUDE.md`.
2. Run the size auditor:
   `node .claude/skills/senior-refactor/scripts/analyze-file-sizes.mjs`
3. Read the largest / most-coupled files. Classify each large file:
   **must split now** / **should split later** / **acceptable exception**.
4. Scan for: duplicated UI patterns, repeated logic, mixed concerns, oversized
   components/hooks, dead code, unsafe `any`, weak naming, poor folder structure, prop
   drilling, and performance issues (use the checklists as lenses).

You may delegate this to the **refactor-planner** subagent.

### Audit output format

- **Executive summary**
- **Top 10 highest-impact refactors** (each: impact · effort · risk)
- **Files over 300 lines** table — `path · lines · kind · classification`
- **Component splitting candidates** — responsibility seams per file
- **Risk map** — what could break; flag behavior-sensitive areas (RTL, money RPCs, auth)
- **Suggested execution order**

---

## 3. Mode: `plan`

Goal: turn the audit into a phased, sequenced plan. **Read-only.** Output the 5 phases:

- **Phase 1 — Safe cleanup:** dead code, unused imports/files, naming, formatting, obvious
  `any` removals. Lowest risk, no behavior change.
- **Phase 2 — Component splitting:** break oversized/mixed-concern components by responsibility
  (see `checklists/react-component-splitting.md`).
- **Phase 3 — Hooks / utils / types extraction:** pull stateful logic into hooks, shared pure
  logic into utils, shapes into `types.ts`; reuse generated Supabase types.
- **Phase 4 — Performance / security pass:** apply `checklists/performance-review.md` +
  `security-review.md` (+ `database-supabase-review.md`). Delegate to
  **performance-security-reviewer** for findings.
- **Phase 5 — Final validation:** full typecheck + lint + unit tests + build green; ask the
  user to run e2e; summarize the changelog.

For each phase: list batches, files, reason, expected risk, and the validation command.

---

## 4. Mode: `execute`

Goal: apply the plan in **small, validated batches**.

> Apply **only ONE logical batch** at a time unless the user explicitly asks for full
> execution. Prefer clean diffs over speed.

Before each batch, print:

- **Files to edit**
- **Reason**
- **Expected risk** (and any behavior-sensitive surface)
- **Validation command(s)**

Then (after `git status` safety check from §0):

1. Make the edits for that one batch. For component/hook extraction, delegate to
   **component-splitter** (preserves behavior, RTL, styling).
2. Validate (delegate to **test-guardian** or run directly):
   - `pnpm exec tsc --noEmit`
   - `pnpm lint`
   - `pnpm test` (unit only — **never** `pnpm test:e2e`)
   - `pnpm build` when the batch could affect it
3. **Fix errors caused by this batch.** Don't expand scope to pre-existing failures (note them).
4. Append to a **running changelog** in your final answer: what changed, why, validation result.
5. Stop and let the user review before the next batch (unless told to continue).

If a batch can't be made green, revert that batch's edits and report — don't leave the tree broken.

---

## 5. Mode: `review-only`

Goal: assessment without edits. Run **all six checklists** read-only and report:

- `checklists/react-component-splitting.md`
- `checklists/typescript-quality.md`
- `checklists/performance-review.md`
- `checklists/security-review.md`
- `checklists/rtl-hebrew-review.md`
- `checklists/database-supabase-review.md`

Output prioritized findings (severity · file:line · issue · recommended fix) and a suggested
remediation order. Make **no** edits. Delegate perf/security depth to
**performance-security-reviewer**.

---

## 6. Refactor rules (condensed — full detail in checklists)

- **300-line soft cap.** Over it is a *signal*, not a mandate. Don't split mechanically.
- **Split by responsibility:** layout · data fetching · form logic · table/list · modal/dialog ·
  card/item · custom hook · validation/schema · constants/config · types · utilities.
- Keep components **close to usage**; prefer **feature folders** before global shared folders.
- **Named exports**; avoid barrel files unless the repo already uses them consistently.
- **Preserve** the styling system, RTL, and Hebrew (`checklists/rtl-hebrew-review.md`).
- **React:** correct server/client boundaries (`*.server.ts`); avoid over-abstraction; memoize
  only when useful; keep props typed; UI mostly presentational; extract reusable stateful logic
  into hooks (`checklists/react-component-splitting.md`, `typescript-quality.md`).
- **Supabase:** never expose the service-role key client-side; keep DB calls server-side where
  possible; respect RLS; avoid N+1; centralize typed query helpers when useful; money only via
  RPCs (`checklists/security-review.md`, `database-supabase-review.md`).

---

## 7. Subagent routing

| Need | Subagent | Mode |
| --- | --- | --- |
| Analyze architecture, produce a safe phased plan | **refactor-planner** (read-only) | audit / plan |
| Extract components/hooks while preserving behavior | **component-splitter** (edits) | execute |
| Run typecheck/lint/unit-tests/build, explain failures | **test-guardian** (read-only + bash) | execute |
| Review React perf, Supabase security, secrets, risky client code | **performance-security-reviewer** (read-only) | plan / review-only |

Delegate only when it helps; for small tasks, do it inline.

---

## 8. Examples

```
/senior-refactor audit
→ Reads package.json/tsconfig/routes, runs analyze-file-sizes.mjs, returns:
  executive summary, top-10 refactors, files>300 table, splitting candidates, risk map, order.

/senior-refactor plan
→ Phases 1–5 with batches, files, reasons, risks, and validation commands.

/senior-refactor execute
→ Checks git status; applies ONE batch (e.g. "split parent/dashboard.tsx into
  DashboardHeader + ChildTiles + PendingTasksTable + use-dashboard-data hook");
  runs tsc/lint/test/build; fixes batch errors; appends changelog; stops for review.

/senior-refactor review-only
→ Runs all six checklists read-only; prioritized findings, no edits.
```
