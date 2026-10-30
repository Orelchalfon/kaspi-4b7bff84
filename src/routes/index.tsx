import { useAuth } from "@/hooks/use-auth";
import { AuthLoader } from "@/components/ui/auth-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useState } from "react";

import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kasp: חינוך פיננסי לילדים, מתחיל בבית" },
      {
        name: "description",
        content:
          "Kasp עוזרת להורים ללמד ילדים לחסוך. מגדירים משימות, הילדים צוברים מטבעות, ואחוז מכל תגמול עובר אוטומטית לחיסכון. ההרשמה חינם.",
      },
      { property: "og:title", content: "Kasp: חינוך פיננסי לילדים, מתחיל בבית" },
      {
        property: "og:description",
        content: "ההורים מגדירים משימות, הילדים צוברים מטבעות, ואחוז מכל תגמול עובר לבד לחיסכון.",
      },
      { property: "og:url", content: "https://kasp-web.kasp.workers.dev/" },
      { property: "og:image", content: "https://kasp-web.kasp.workers.dev/og-image.jpg" },
      { property: "og:image:alt", content: "Kasp" },
      { name: "twitter:title", content: "Kasp: חינוך פיננסי לילדים, מתחיל בבית" },
      {
        name: "twitter:description",
        content: "ההורים מגדירים משימות, הילדים צוברים מטבעות, ואחוז מכל תגמול עובר לבד לחיסכון.",
      },
      { name: "twitter:image", content: "https://kasp-web.kasp.workers.dev/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://kasp-web.kasp.workers.dev/" }],
  }),
  component: Index,
});

// Supabase's default persisted-session key (`client.ts` sets no custom storageKey).
const AUTH_STORAGE_KEY = "sb-jlpvjxywfvijntsctvaq-auth-token";

function hasStoredSession(): boolean {
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function Index() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();
  // The server can't know the auth state, so it always renders the landing page (fast
  // FCP/LCP for visitors). A returning signed-in user swaps to the loader before paint
  // instead of seeing the landing flash while the session resolves.
  const [mayBeSignedIn, setMayBeSignedIn] = useState(false);

  useLayoutEffect(() => {
    if (hasStoredSession()) setMayBeSignedIn(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && role === "parent") {
      navigate({ to: "/parent/dashboard" });
    } else if (isAuthenticated && role === "child") {
      navigate({ to: "/child/dashboard" });
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isAuthenticated || (isLoading && mayBeSignedIn)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <AuthLoader title="מכינים את החשבון שלכם..." subtitle="רגע אחד, מעבירים אתכם למסך שלכם" />
      </main>
    );
  }

  return <LandingPage />;
}
