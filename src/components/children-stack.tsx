import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export interface ChildStackItem {
  id: string;
  display_name: string;
  avatar: string | null;
}

interface ChildrenStackProps {
  childrenList: ChildStackItem[];
  selectedChildId: string | null;
  pendingByChild: Record<string, number>;
  onSelect: (id: string) => void;
}

// Inline stack of child-avatar buttons. Active sits at the start edge (right in
// RTL); inactive children peek out behind toward the end. Desktop: hover opens
// the fan. Mobile: tap the top avatar to toggle. Selecting a non-active avatar
// fires onSelect and collapses. Each child shows its chosen icon + color (or a
// deterministic fallback derived from its id).
export function ChildrenStack({
  childrenList,
  selectedChildId,
  pendingByChild,
  onSelect,
}: ChildrenStackProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isExpanded]);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) ?? childrenList[0] ?? null;
  const ordered = activeChild
    ? [activeChild, ...childrenList.filter((c) => c.id !== activeChild.id)]
    : childrenList;

  const n = ordered.length;
  const expandedWidth = 48 + Math.max(0, n - 1) * 64;
  const activePending = activeChild ? (pendingByChild[activeChild.id] ?? 0) : 0;

  function handleAvatarClick(child: ChildStackItem, isActive: boolean) {
    if (isActive) {
      setIsExpanded((prev) => !prev);
      return;
    }
    onSelect(child.id);
    setIsExpanded(false);
  }

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <div
        role="group"
        aria-label="ילדים"
        ref={wrapperRef}
        onMouseEnter={isMobile ? undefined : () => setIsExpanded(true)}
        onMouseLeave={isMobile ? undefined : () => setIsExpanded(false)}
        className="relative h-20 overflow-visible"
        style={{ width: `${expandedWidth}px`, maxWidth: "100%" }}
      >
        {ordered.map((child, i) => {
          const isActive = i === 0;
          const pending = pendingByChild[child.id] ?? 0;
          const { icon, color } = parseAvatar(child.avatar, child.id);

          let transform = "translateX(0) scale(1)";
          let opacity = 1;
          if (!isExpanded && !isActive) {
            const scale = Math.max(0.85, 1 - i * 0.06);
            transform = `translateX(${i * -24}px) scale(${scale})`;
            opacity = 0.8;
          } else if (isExpanded && !isActive) {
            transform = `translateX(${i * -64}px) scale(1)`;
          }

          return (
            <Tooltip key={child.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleAvatarClick(child, isActive)}
                  aria-pressed={isActive}
                  aria-expanded={isActive ? isExpanded : undefined}
                  aria-label={`בחר את ${child.display_name}`}
                  className={cn(
                    "absolute start-0 top-2 rounded-full transition-[transform,opacity] duration-300 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "motion-reduce:transition-none",
                  )}
                  style={{
                    transform,
                    opacity,
                    zIndex: n - i,
                    transitionDelay: `${i * 40}ms`,
                  }}
                >
                  <span className="relative inline-flex">
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
                        color.bg,
                        isActive ? cn("ring-2", color.ring) : "opacity-90",
                      )}
                      aria-hidden
                    >
                      {icon.emoji}
                    </span>
                    {pending > 0 && (
                      <span
                        className="absolute -top-1 -start-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[11px] font-bold tabular-nums text-warning-foreground shadow-sm"
                        aria-hidden
                      >
                        {pending}
                      </span>
                    )}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={10}
                className={cn(
                  "border-2 border-foreground/25 bg-popover px-3 py-1.5 text-sm font-semibold text-popover-foreground shadow-lg",
                  "data-[state=delayed-open]:zoom-in-90 data-[state=closed]:zoom-out-90",
                  "data-[state=delayed-open]:duration-200",
                )}
              >
                {child.display_name}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {isMobile
          ? activeChild && (
              <span
                className="pointer-events-none absolute start-0 top-[58px] inline-block max-w-[160px] truncate text-xs font-semibold text-foreground"
                aria-live="polite"
              >
                {activeChild.display_name}
                {activePending > 0 ? ` · ${activePending} ממתינות` : ""}
              </span>
            )
          : activePending > 0 && (
              <span
                className={cn(
                  "pointer-events-none absolute start-0 top-[60px] inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-bold tabular-nums text-warning-foreground transition-opacity duration-300 ease-out",
                  "motion-reduce:transition-none",
                  isExpanded ? "opacity-100" : "opacity-0",
                )}
                aria-label={`${activePending} משימות ממתינות לאישור`}
              >
                {activePending} ממתינות
              </span>
            )}
      </div>
    </TooltipProvider>
  );
}
