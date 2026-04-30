## Goal

The CLI `npx skills add ...` doesn't work in Lovable — skills are platform-provided, not pluggable from npm. But the **UI/UX Pro Max** skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill, 72.5k ⭐) is just a markdown ruleset. I'll embed its rules into project memory so I follow them automatically on every UI change going forward, then do an audit + refactor pass on the existing screens.

## Deliverables

1. **`mem://design/uxui-pro-max`** — distilled ruleset (10 categories, priority-ordered) saved to project memory.
2. **`mem://index.md`** — Core gets one line: *"Follow UI/UX Pro Max rules on every UI change → mem://design/uxui-pro-max"* + reference link to the file.
3. **Audit + refactor pass** on existing screens (login, signup, parent dashboard, parent children/tasks/transactions, child dashboard/wallet/task detail, layouts).

## The ruleset (priority order)

| # | Category | Priority |
|---|---|---|
| 1 | Accessibility (contrast 4.5:1, focus rings, aria-labels, keyboard nav, reduced-motion) | CRITICAL |
| 2 | Touch & interaction (≥44px targets, 8px gaps, loading states, press feedback) | CRITICAL |
| 3 | Performance (CLS<0.1, lazy loading, skeleton >300ms) | HIGH |
| 4 | Style consistency (SVG icons not emoji, one primary CTA per screen, consistent elevation) | HIGH |
| 5 | Layout & responsive (mobile-first, 4/8pt spacing, no horizontal scroll, min-h-dvh) | HIGH |
| 6 | Typography & color (≥16px body, line-height 1.5, semantic tokens only, tabular nums for $) | MEDIUM |
| 7 | Animation (150–300ms, transform/opacity only, motion has meaning, respect reduced-motion) | MEDIUM |
| 8 | Forms & feedback (visible labels, inline error below field, validate on blur, success feedback) | MEDIUM |
| 9 | Navigation (predictable back, ≤5 bottom-nav items, deep links) | HIGH |
| 10 | Charts/data (legends, tooltips, never color-only) | LOW |

Plus KidCoin-specific addenda: RTL-correct logical properties (start/end not left/right), Hebrew typography (Rubik base 16px, line-height 1.6), coin balance always tabular, child UI larger touch targets (≥48px), playful but not childish (no comic fonts, no random emojis as icons).

## Audit findings (current state)

Screens reviewed: `login.tsx`, `signup.tsx`, `parent.tsx`, `parent/dashboard.tsx`, `parent/children.*`, `parent/tasks.*`, `parent/transactions.tsx`, `child.tsx`, `child/dashboard.tsx`, `child/tasks.$taskId.tsx`, `child/wallet.tsx`.

Issues to fix:

- **Emoji as icons everywhere** (🪙, ✅, ❌, +) — violates `no-emoji-icons`. Replace with Lucide icons; keep 🪙 only as a brand/coin glyph in hero spots, not as functional UI.
- **Loading state is just `טוען...`** — violates `progressive-loading`. Replace with skeleton screens on dashboards and lists.
- **No success feedback on submit** (login, signup, child create, task create, approve) — violates `success-feedback` & `submit-feedback`. Add toast confirmations (Sonner is already installed).
- **No empty-state CTAs in some places** (transactions, child wallet) — partial coverage.
- **No inline form validation** — only generic error at top. Move errors below fields, validate on blur.
- **No password show/hide toggle** on login/signup — violates `password-toggle`.
- **No autocomplete attrs** on email/password — violates `autofill-support`.
- **`min-h-screen` used** — violates `viewport-units`. Switch to `min-h-dvh` for mobile correctness.
- **Cards used as links wrap `<Card>` inside `<Link>`** — accessible but produces nested-interactive markup; refactor to use Card with proper role + onClick or a styled Link.
- **Header nav uses `cursor-pointer` only via global rule** — fine, but no active-route visual weight beyond bg color; add weight/underline for clarity.
- **Coin balance numbers** not tabular — small visual jitter when amounts change. Add `tabular-nums`.
- **No skip-to-content link** in layouts — a11y miss.
- **Destructive actions** (reject task) currently look the same as approve — needs danger color + confirmation dialog.
- **Focus rings**: relying on default; verify visible in both themes (especially child dashboard purple card).

## Plan of execution

### Step 1 — Save the ruleset to memory (2 files)
- Write `mem://design/uxui-pro-max` with full distilled rules + KidCoin addenda + a "self-check before finishing any UI change" checklist.
- Update `mem://index.md`: add Core line + Memories entry.

### Step 2 — Foundation refactors
- Add `<Toaster />` (Sonner) to root layout if not mounted; create a tiny `useToast` wrapper.
- Add a skip-to-content link + `<main id="main">` in parent.tsx and child.tsx layouts.
- Swap `min-h-screen` → `min-h-dvh` everywhere.
- Build a small `<Skeleton>`-based `<DashboardSkeleton />` and `<ListSkeleton />` for reuse.
- Add a `<CoinAmount value={n} />` component with Lucide `Coins` icon + tabular nums.
- Add a `<StatusBadge status="..." />` with icon + text (not color-only).

### Step 3 — Auth screens (login, signup)
- Password show/hide toggle (Lucide `Eye`/`EyeOff`).
- `autocomplete="email"` / `current-password` / `new-password`.
- Inline error below the offending field; success toast on signup before navigate.
- Replace 🪙 hero with a real branded mark (small Lucide `Coins` in a colored circle).

### Step 4 — Parent screens
- `parent/dashboard.tsx`: skeleton state, replace emoji counts/badges with Lucide icons + StatusBadge, primary CTA "+ ילד חדש" emphasized, secondary "+ משימה" subordinate.
- `parent/children.new.tsx`: inline validation, success toast → navigate.
- `parent/tasks.new.tsx`: same treatment + helper text on reward field.
- `parent/tasks.$taskId.tsx`: confirmation dialog before reject; danger styling on reject; success toast on approve; show approval in real-time.
- `parent/transactions.tsx`: empty state with action; tabular nums for amounts.

### Step 5 — Child screens
- `child/dashboard.tsx`: balance card a11y (aria-label "היתרה שלי, X מטבעות"), bigger touch targets (≥48px), skeleton, StatusBadge with icon.
- `child/tasks.$taskId.tsx`: clear single primary CTA "סיימתי!", success toast → return.
- `child/wallet.tsx`: tabular nums, transaction icons, empty state.

### Step 6 — Layout polish
- Active nav link gets bold + underline (not just bg).
- Visible focus ring on all interactive elements (primary color, 2px).
- Verify dark mode contrast (we have it defined but don't expose a toggle yet — out of scope unless you want it).

### Step 7 — Self-verification
After refactors, run through the 10-rule checklist on each refactored screen and report any items intentionally deferred.

## Out of scope (not doing unless asked)

- Adding a dark-mode toggle UI (tokens exist, no switcher).
- Replacing the entire color palette (current tokens are fine).
- Animation/motion library (Framer Motion) — using Tailwind transitions only.
- Mobile bottom nav (current top header is acceptable for the screen count).

## Technical notes

- All new icons: `lucide-react` (already installed).
- All new toasts: `sonner` (already installed via shadcn).
- Memory paths use `mem://` namespace; the index file is replaced wholesale on update — I'll preserve all current entries and add new ones.
- No DB changes, no new dependencies, no edge functions touched.

## What you'll see after approval

I'll execute Steps 1–7 in order. You'll get: memory written, then a wave of file edits across ~12 route/layout files plus 2–3 small new shared components. Then I'll summarize what changed and what to test.
