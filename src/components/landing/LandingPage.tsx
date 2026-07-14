import { LazyMotion, domAnimation } from "framer-motion";
import { lazy, Suspense } from "react";

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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        דלג לתוכן
      </a>
      <LandingNav />
      <Hero />
      <Suspense fallback={null}>
        <HowItWorks />
        <FeatureRows />
        <AiTutor />
        <RoleSplit />
        <TrustStrip />
        <Faq />
        <ClosingCta />
        <Footer />
      </Suspense>
    </LazyMotion>
  );
}
