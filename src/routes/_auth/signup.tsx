import { createFileRoute } from "@tanstack/react-router";

// UI lives in the `_auth` layout (AuthSwitch, sign-up mode); this route supplies meta only.
export const Route = createFileRoute("/_auth/signup")({
  head: () => ({
    meta: [
      { title: "הרשמה — Kasp" },
      {
        name: "description",
        content: "פתחו חשבון הורה ב-Kasp והתחילו לנהל משימות, מטבעות וחיסכון של הילדים.",
      },
      { property: "og:title", content: "הרשמה — Kasp" },
      { property: "og:description", content: "פתחו חשבון הורה חדש ב-Kasp." },
      { property: "og:url", content: "https://kasp-web.kasp.workers.dev/signup" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kasp-web.kasp.workers.dev/signup" }],
  }),
});
