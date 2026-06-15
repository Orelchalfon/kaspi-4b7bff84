// Curated catalog of kid-friendly avatars (icon + color) for child profiles.
// Stored on `child_profiles.avatar` as the string "<iconKey>|<colorKey>".
// A null/invalid value resolves deterministically from the child id, so every
// child stays visually distinct even without an explicit choice.

export interface AvatarIcon {
  key: string;
  emoji: string;
  labelHe: string;
}

export interface AvatarColor {
  key: string;
  labelHe: string;
  // Static Tailwind classes (no dynamic names — Tailwind must see them literally).
  bg: string; // soft tint behind the emoji
  ring: string; // ring color when the avatar is active/selected
  solid: string; // solid swatch used inside the picker
}

export const AVATAR_ICONS: readonly AvatarIcon[] = [
  { key: "fox", emoji: "🦊", labelHe: "שועל" },
  { key: "cat", emoji: "🐱", labelHe: "חתול" },
  { key: "unicorn", emoji: "🦄", labelHe: "חד-קרן" },
  { key: "dog", emoji: "🐶", labelHe: "כלב" },
  { key: "panda", emoji: "🐼", labelHe: "פנדה" },
  { key: "lion", emoji: "🦁", labelHe: "אריה" },
  { key: "frog", emoji: "🐸", labelHe: "צפרדע" },
  { key: "penguin", emoji: "🐧", labelHe: "פינגווין" },
  { key: "rabbit", emoji: "🐰", labelHe: "ארנב" },
  { key: "turtle", emoji: "🐢", labelHe: "צב" },
] as const;

export const AVATAR_COLORS: readonly AvatarColor[] = [
  {
    key: "purple",
    labelHe: "סגול",
    bg: "bg-purple-100",
    ring: "ring-purple-400",
    solid: "bg-purple-400",
  },
  { key: "blue", labelHe: "כחול", bg: "bg-blue-100", ring: "ring-blue-400", solid: "bg-blue-400" },
  {
    key: "green",
    labelHe: "ירוק",
    bg: "bg-green-100",
    ring: "ring-green-400",
    solid: "bg-green-400",
  },
  {
    key: "orange",
    labelHe: "כתום",
    bg: "bg-orange-100",
    ring: "ring-orange-400",
    solid: "bg-orange-400",
  },
  { key: "pink", labelHe: "ורוד", bg: "bg-pink-100", ring: "ring-pink-400", solid: "bg-pink-400" },
  {
    key: "yellow",
    labelHe: "צהוב",
    bg: "bg-yellow-100",
    ring: "ring-yellow-400",
    solid: "bg-yellow-400",
  },
] as const;

export const DEFAULT_ICON_KEY = AVATAR_ICONS[0].key;
export const DEFAULT_COLOR_KEY = AVATAR_COLORS[0].key;

export interface ResolvedAvatar {
  icon: AvatarIcon;
  color: AvatarColor;
}

export function serializeAvatar(iconKey: string, colorKey: string): string {
  return `${iconKey}|${colorKey}`;
}

// Tiny deterministic string hash (djb2). Stable across reloads for a given seed.
function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Resolves a stored `avatar` value into its icon + color catalog entries.
 * Falls back to a deterministic pick from `seed` (the child id) when the value
 * is null or doesn't match the current catalog.
 */
export function parseAvatar(value: string | null | undefined, seed: string): ResolvedAvatar {
  const [iconKey, colorKey] = (value ?? "").split("|");
  const icon = AVATAR_ICONS.find((i) => i.key === iconKey);
  const color = AVATAR_COLORS.find((c) => c.key === colorKey);
  if (icon && color) return { icon, color };

  const h = hash(seed || "");
  return {
    icon: icon ?? AVATAR_ICONS[h % AVATAR_ICONS.length],
    color: color ?? AVATAR_COLORS[(h >>> 8) % AVATAR_COLORS.length],
  };
}
