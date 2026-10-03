import { createFileRoute } from "@tanstack/react-router";

// UI lives in the `_auth` layout (AuthSwitch, sign-in mode); this route supplies meta only.
export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [
      { title: "התחברות — Kasp" },
      {
        name: "description",
        content: "התחברו לחשבון Kasp שלכם כדי לנהל משימות, מטבעות וחיסכון של המשפחה.",
      },
      { property: "og:title", content: "התחברות — Kasp" },
      { property: "og:description", content: "התחברו לחשבון Kasp שלכם." },
      { property: "og:url", content: "https://kasp-web.kasp.workers.dev/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kasp-web.kasp.workers.dev/login" }],
  }),
});
