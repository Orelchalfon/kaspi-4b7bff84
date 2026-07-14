import { Component, lazy, Suspense, useRef, type ReactNode } from "react";
import { useInView } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";

// Heavy WebGL dependency - only mounted once this section scrolls into view
// (see useInView below), so it doesn't weigh down the initial landing bundle.
const Spline = lazy(() => import("@splinetool/react-spline"));

const TUTOR_AVATAR_SCENE = "https://prod.spline.design/LDGLw9lCDGGf-YiO/scene.splinecode";

// A blocked network request or unsupported WebGL context is a realistic
// failure mode for a third-party CDN asset - fall back to a static badge
// rather than breaking the landing page layout.
class SplineErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[landing ai-tutor] Spline scene failed to load", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function ScenePlaceholder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, var(--ks-cyan-soft) 0%, transparent 70%)",
        }}
      />
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
    </div>
  );
}

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-8 w-8" aria-hidden />
      </span>
    </div>
  );
}

export function TutorAvatarScene() {
  const ref = useRef<HTMLDivElement>(null);
  // The Spline scene has its own baked-in animation that isn't reachable via
  // useReducedMotion() - gating the mount behind useInView({ once: true }) is
  // a partial, best-effort mitigation: it at least keeps the animation from
  // starting while the scene is still offscreen.
  const inView = useInView(ref, { amount: 0.3, once: true });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative h-full min-h-[320px] w-full overflow-hidden rounded-3xl md:min-h-[380px]"
    >
      {inView ? (
        <SplineErrorBoundary fallback={<SceneFallback />}>
          <Suspense fallback={<ScenePlaceholder />}>
            <Spline scene={TUTOR_AVATAR_SCENE} style={{ width: "100%", height: "100%" }} />
          </Suspense>
        </SplineErrorBoundary>
      ) : (
        <ScenePlaceholder />
      )}
    </div>
  );
}
