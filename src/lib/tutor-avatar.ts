// The 3D tutor avatar is a ~4 MB Spline runtime (+ physics chunk). These helpers keep it
// off the critical path of a live voice call: prefetch it while the child is still browsing,
// and skip it entirely for data-saver users.

export const TUTOR_AVATAR_SCENE = "https://prod.spline.design/LDGLw9lCDGGf-YiO/scene.splinecode";

/** Shared loader so `React.lazy` and the idle prefetch hit the same cached chunk. */
export const loadSpline = () => import("@splinetool/react-spline");

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Runs `cb` when the browser is idle (setTimeout fallback for Safari). Returns a canceller. */
export function onIdle(cb: () => void, timeout = 2000): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 200);
  return () => window.clearTimeout(id);
}

/** True when the user asked the browser to save data - the avatar is decorative, so skip it. */
export function prefersSaveData(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return nav.connection?.saveData === true;
}

/** Warms the Spline chunk in the background (e.g. from the tutors list). */
export function prefetchTutorAvatar(): () => void {
  if (prefersSaveData()) return () => {};
  return onIdle(() => {
    loadSpline().catch(() => {});
  });
}
