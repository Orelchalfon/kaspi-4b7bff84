import type { Transition, Variants } from "framer-motion";

export const easeOutSoft: Transition["ease"] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutSoft },
  },
};

export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOutSoft },
  },
};

export const heroStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const deviceFrameReveal: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: easeOutSoft },
  },
};

export const floatingToastReveal: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 220,
      damping: 22,
      delay: 0.9,
    },
  },
};

export const ctaInteractions = {
  whileHover: { scale: 1.015 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring" as const, stiffness: 380, damping: 26 },
};

export const cardHoverLift = {
  whileHover: { y: -4 },
  transition: { type: "spring" as const, stiffness: 300, damping: 28 },
};

export const viewportOnce = { once: true, margin: "-10% 0px" } as const;
