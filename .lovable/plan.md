## Goal

In the parent dashboard (`/parent/dashboard`), replace the plain initial-letter circle inside each child selector card with the `ChildAvatar` component (the one with the verified-badge style we built), and change the children grid to a horizontal stack so children sit side-by-side and wrap as needed.

## Changes

**File: `src/routes/parent/dashboard.tsx`**

1. Import `ChildAvatar` from `@/components/child-avatar`.
2. Inside the children list, replace the `<span>` that shows `child.display_name.charAt(0)` (the colored initial circle) with:
   ```
   <ChildAvatar name={child.display_name} size="md" verified={isActive} />
   ```
   The verified badge appears on the currently selected child for clear visual feedback (alternative: always verified — easy to tweak).
3. Change the wrapper from a responsive grid (`grid gap-3 sm:grid-cols-2 lg:grid-cols-3`) to a horizontal flex row that wraps:
   ```
   flex flex-wrap gap-3
   ```
   Each child card becomes a fixed-width card (e.g. `min-w-[220px] flex-1 sm:flex-none sm:basis-[260px]`) so multiple children stack horizontally and wrap to a new line when they overflow the row.

## Result

- Each child in the parent dashboard shows the proper avatar component with the verified badge (consistent with the children list and transactions pages).
- Adding a new child appends it to the right of the existing one(s); when the row is full, cards wrap to the next line.
- All other behavior (selection, pending badge, balance, RTL) is preserved.

## Notes

- No DB or schema changes.
- No new dependencies — `ChildAvatar` and `@radix-ui/react-avatar` are already in the project.
- RTL safe: `flex flex-wrap` respects the `dir="rtl"` document direction, so the first child appears on the right and new ones flow leftward.
