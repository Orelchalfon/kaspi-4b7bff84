import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";

import { Hero } from "./Hero";
import { LandingNav } from "./LandingNav";

const HowItWorks = lazy(() => import("./HowItWorks").then((m) => ({ default: m.HowItWorks })));
const FeatureRows = lazy(() => import("./FeatureRows").then((m) => ({ default: m.FeatureRows })));
const AiTutor = lazy(() => import("./AiTutor").then((m) => ({ default: m.AiTutor })));
const RoleSplit = lazy(() => import("./RoleSplit").then((m) => ({ default: m.RoleSplit })));
const TrustStrip = lazy(() => import("./TrustStrip").then((m) => ({ default: m.TrustStrip })));
const Faq = lazy(() => import("./Faq").then((m) => ({ default: m.Faq })));
const ClosingCta = lazy(() => import("./ClosingCta").then((m) => ({ default: m.ClosingCta })));
const Footer = lazy(() => import("./ClosingCta").then((m) => ({ default: m.Footer })));

export function LandingPage() {
  return (
    <LazyMotion features={domAnimation} strict>
      {/* "user" drops transform/layout motion (keeps opacity fades) when the OS asks for reduced motion. */}
      <MotionConfig reducedMotion="user">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          דלג לתוכן
        </a>
        <LandingNav />
        {/* tabIndex lets the skip link move keyboard focus here, not just scroll. */}
        <main id="main" tabIndex={-1} className="outline-none">
          <Hero />
          <Suspense fallback={null}>
            <HowItWorks />
            <FeatureRows />
            <AiTutor />
            <RoleSplit />
            <TrustStrip />
            <Faq />
            <ClosingCta />
            <ScrollToHashOnReady />
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  );
}

/**
 * Sections below the hero are lazy, so on a deep link like `/#savings` the target
 * doesn't exist when the browser tries to scroll. Rendered last inside the same
 * Suspense boundary, this mounts only once every lazy section has resolved.
 */
function ScrollToHashOnReady() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return null;
}
