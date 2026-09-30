import { createFileRoute } from "@tanstack/react-router";

// UI lives in the `_auth` layout (AuthSwitch, sign-up mode); this route supplies meta only.
export const Route = createFileRoute("/_auth/signup")({
  head: () => ({
    meta: [
      { title: "הרשמה — Kaspii" },
      {
        name: "description",
        content: "פתחו חשבון הורה ב-Kaspii והתחילו לנהל משימות, מטבעות וחיסכון של הילדים.",
      },
      { property: "og:title", content: "הרשמה — Kaspii" },
      { property: "og:description", content: "פתחו חשבון הורה חדש ב-Kaspii." },
      { property: "og:url", content: "https://kidcoin.app/signup" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kidcoin.app/signup" }],
  }),
});
