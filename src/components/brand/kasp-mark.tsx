import type { SVGProps } from "react";

/**
 * The Kasp "Grow Together" mark (a child held inside a pocket), shared with the mobile app
 * (`kasp-mobile/assets/brand/kasp-mark.svg`). Filled with `currentColor`, so colour it with
 * a text utility such as `text-primary`.
 */
export function KaspMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden {...props}>
      <g fill="currentColor" transform="translate(0 2)">
        <circle cx="50" cy="20" r="19" />
        <path d="M0 28A10 10 0 0 1 10 18C17 18 22.5 20.5 22.5 26A27.5 27.5 0 0 0 77.5 26C77.5 20.5 83 18 90 18A10 10 0 0 1 100 28V55A40 40 0 0 1 60 95H40A40 40 0 0 1 0 55Z" />
      </g>
    </svg>
  );
}
