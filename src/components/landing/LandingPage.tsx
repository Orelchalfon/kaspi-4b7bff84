import { LazyMotion, domAnimation } from "framer-motion";

import { ClosingCta, Footer } from "./ClosingCta";
import { Faq } from "./Faq";
import { FeatureRows } from "./FeatureRows";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingNav } from "./LandingNav";
import { RoleSplit } from "./RoleSplit";
import { TrustStrip } from "./TrustStrip";

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
      <HowItWorks />
      <FeatureRows />
      <RoleSplit />
      <TrustStrip />
      <Faq />
      <ClosingCta />
      <Footer />
    </LazyMotion>
  );
}
