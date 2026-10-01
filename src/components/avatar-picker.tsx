import { useRef, type KeyboardEvent } from "react";
import { AVATAR_COLORS, AVATAR_ICONS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  iconKey: string;
  colorKey: string;
  onChange: (iconKey: string, colorKey: string) => void;
  className?: string;
}

/**
 * Radio-group keyboard pattern: only the selected option is in the tab order, and the
 * arrow keys move + select within the group. Moves follow DOM order, so in RTL
 * ArrowLeft goes to the next option visually (and ArrowRight to the previous).
 */
function useRadioKeys(keys: readonly string[], current: string, select: (key: string) => void) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
    const backward = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
    const i = Math.max(0, keys.indexOf(current));
    let next: number | null = null;
    if (forward.includes(e.key)) next = (i + 1) % keys.length;
    else if (backward.includes(e.key)) next = (i - 1 + keys.length) % keys.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = keys.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(keys[next]);
    refs.current[keys[next]]?.focus();
  };
  const register = (key: string) => (el: HTMLButtonElement | null) => {
    refs.current[key] = el;
  };
  return { onKeyDown, register };
}

// Controlled icon + color picker for a child's avatar. RTL-safe (logical
// classes only), keyboard-operable, with Hebrew aria-labels from the catalog.
export function AvatarPicker({ iconKey, colorKey, onChange, className }: AvatarPickerProps) {
  const color = AVATAR_COLORS.find((c) => c.key === colorKey) ?? AVATAR_COLORS[0];
  const iconKeys = AVATAR_ICONS.map((i) => i.key);
  const colorKeys = AVATAR_COLORS.map((c) => c.key);
  const iconNav = useRadioKeys(iconKeys, iconKey, (k) => onChange(k, colorKey));
  const colorNav = useRadioKeys(colorKeys, colorKey, (k) => onChange(iconKey, k));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <p id="avatar-picker-icon-label" className="mb-2 text-xs font-medium text-muted-foreground">
          בחרו דמות
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby="avatar-picker-icon-label"
        >
          {AVATAR_ICONS.map((icon) => {
            const selected = icon.key === iconKey;
            return (
              <button
                key={icon.key}
                ref={iconNav.register(icon.key)}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={icon.labelHe}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(icon.key, colorKey)}
                onKeyDown={iconNav.onKeyDown}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full text-xl transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? cn(color.bg, "ring-2", color.ring) : "bg-muted hover:bg-muted/70",
                )}
              >
                <span aria-hidden>{icon.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p
          id="avatar-picker-color-label"
          className="mb-2 text-xs font-medium text-muted-foreground"
        >
          צבע
        </p>
        <div
          className="flex flex-wrap gap-1"
          role="radiogroup"
          aria-labelledby="avatar-picker-color-label"
        >
          {AVATAR_COLORS.map((c) => {
            const selected = c.key === colorKey;
            return (
              // 44px hit area around the same 32px swatch.
              <button
                key={c.key}
                ref={colorNav.register(c.key)}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.labelHe}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(iconKey, c.key)}
                onKeyDown={colorNav.onKeyDown}
                className="group flex size-11 items-center justify-center rounded-full focus-visible:outline-none"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-8 rounded-full transition group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
                    c.solid,
                    selected
                      ? "ring-2 ring-foreground/60 ring-offset-2"
                      : "opacity-80 group-hover:opacity-100",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
