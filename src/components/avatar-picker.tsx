import { AVATAR_COLORS, AVATAR_ICONS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  iconKey: string;
  colorKey: string;
  onChange: (iconKey: string, colorKey: string) => void;
  className?: string;
}

// Controlled icon + color picker for a child's avatar. RTL-safe (logical
// classes only), keyboard-focusable, with Hebrew aria-labels from the catalog.
export function AvatarPicker({ iconKey, colorKey, onChange, className }: AvatarPickerProps) {
  const color = AVATAR_COLORS.find((c) => c.key === colorKey) ?? AVATAR_COLORS[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">בחרו דמות</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="דמות">
          {AVATAR_ICONS.map((icon) => {
            const selected = icon.key === iconKey;
            return (
              <button
                key={icon.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={icon.labelHe}
                onClick={() => onChange(icon.key, colorKey)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full text-xl transition",
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
        <p className="mb-2 text-xs font-medium text-muted-foreground">צבע</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="צבע">
          {AVATAR_COLORS.map((c) => {
            const selected = c.key === colorKey;
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={c.labelHe}
                onClick={() => onChange(iconKey, c.key)}
                className={cn(
                  "h-8 w-8 rounded-full transition",
                  c.solid,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "ring-2 ring-offset-2 ring-foreground/60"
                    : "opacity-80 hover:opacity-100",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
