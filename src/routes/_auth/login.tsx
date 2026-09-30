import { createFileRoute } from "@tanstack/react-router";

// UI lives in the `_auth` layout (AuthSwitch, sign-in mode); this route supplies meta only.
export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [
      { title: "התחברות — Kaspii" },
      {
        name: "description",
        content: "התחברו לחשבון Kaspii שלכם כדי לנהל משימות, מטבעות וחיסכון של המשפחה.",
      },
      { property: "og:title", content: "התחברות — Kaspii" },
      { property: "og:description", content: "התחברו לחשבון Kaspii שלכם." },
      { property: "og:url", content: "https://kidcoin.app/login" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://kidcoin.app/login" }],
  }),
});
