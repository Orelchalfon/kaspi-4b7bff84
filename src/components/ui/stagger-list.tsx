import * as React from "react";
import { LazyMotion, domAnimation, m, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";

/*
 * Reusable staggered list entrance.
 *
 *   <StaggerList replayKey={filter} className="flex flex-col gap-2">
 *     {rows.map((row, i) => (
 *       <StaggerItem key={row.id} index={i}>…</StaggerItem>
 *     ))}
 *   </StaggerList>
 *
 * - Items fade + rise in, each delayed by its index. The delay is capped so long lists
 *   (e.g. a 50-row page) finish quickly instead of trickling in for seconds.
 * - Changing `replayKey` (a filter, a tab…) remounts the list and replays the entrance.
 * - Items appended later (e.g. "load more") animate in on mount, staggered from their
 *   own index within the cap.
 * - Honors prefers-reduced-motion: items render in place with no animation.
 * - Uses LazyMotion + `m`, so it is safe inside the app's LazyMotion-strict trees.
 */

const STEP_SECONDS = 0.04;
const MAX_STAGGERED = 10;

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
      delay: Math.min(index, MAX_STAGGERED) * STEP_SECONDS,
    },
  }),
};

type ListTag = "ul" | "ol" | "div";

const ReducedMotionContext = React.createContext(false);

interface StaggerListProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render. Use "div" when the children aren't list items. @default "ul" */
  as?: ListTag;
  /** Change this to replay the entrance (e.g. the active filter). */
  replayKey?: React.Key;
  children: React.ReactNode;
}

export function StaggerList({
  as = "ul",
  replayKey,
  className,
  children,
  ...props
}: StaggerListProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const Tag = as;
  return (
    <LazyMotion features={domAnimation} strict>
      <ReducedMotionContext.Provider value={reduceMotion}>
        <Tag key={replayKey} className={cn(className)} {...props}>
          {children}
        </Tag>
      </ReducedMotionContext.Provider>
    </LazyMotion>
  );
}

interface StaggerItemProps {
  className?: string;
  /** Position in the list; drives the entrance delay. */
  index: number;
  /** Match the parent: "li" inside ul/ol, "div" inside a div list. @default "li" */
  as?: "li" | "div";
  children: React.ReactNode;
}

export function StaggerItem({ index, as = "li", className, children }: StaggerItemProps) {
  const reduceMotion = React.useContext(ReducedMotionContext);
  const Comp = as === "li" ? m.li : m.div;
  return (
    <Comp
      className={className}
      custom={index}
      variants={itemVariants}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
    >
      {children}
    </Comp>
  );
}
