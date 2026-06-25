# Checklist — RTL & Hebrew review

This app is **Hebrew-first and RTL**. `__root.tsx` sets `<html lang="he" dir="rtl">`.
Every refactor must preserve RTL correctness and Hebrew copy.

## Logical properties only

- Use logical sides: `ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`, `text-start`/`text-end`.
- **Never** use physical sides: `ml-`/`mr-`, `pl-`/`pr-`, `left-`/`right-`,
  `text-left`/`text-right`, `rounded-l-*`/`rounded-r-*`.
- Grep for `\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)` when reviewing a diff;
  each hit is a likely RTL bug.
- For flx/absolute positioning, prefer `start-0`/`end-0` over `left-0`/`right-0`.

## Copy

- All user-facing strings are **Hebrew**. Don't introduce English UI copy.
- Keep existing Hebrew strings byte-for-byte when moving code between files (no accidental
  re-encoding or smart-quote substitution).

## Progress bars & directional fills

- The shadcn `Progress` primitive uses CSS `translateX` and fills from the **left** edge
  regardless of `dir="rtl"`. For directional progress (e.g. `/child/savings` goals), use a
  plain width-based `<div style={{ width: '${pct}%' }}>` that inherits the start edge from
  its container. Don't "fix" those back to the shadcn `Progress` component.

## Icons & direction

- Directional icons (arrows, chevrons, back buttons) should point correctly for RTL.
  Watch for hardcoded left/right chevrons after a split.

## Validation

- Visually confirm layout still mirrors correctly (start = right in this app).
- `pnpm exec tsc --noEmit` + `pnpm lint` after any class/markup change.
