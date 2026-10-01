import { useAuth } from "@/hooks/use-auth";
import { AuthLoader } from "@/components/ui/auth-loader";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kaspii — המשפחה לומדת לחסוך, יחד" },
      {
        name: "description",
        content:
          "Kaspii היא סביבת תרגול משפחתית: הורים מגדירים משימות, ילדים צוברים מטבעות, ואחוז מכל תגמול הולך אוטומטית לחיסכון.",
      },
      { property: "og:title", content: "Kaspii — המשפחה לומדת לחסוך, יחד" },
      {
        property: "og:description",
        content: "הורים מגדירים משימות. ילדים צוברים מטבעות. אחוז מכל תגמול הולך אוטומטית לחיסכון.",
      },
      { property: "og:url", content: "https://kaspii-web.kaspii.workers.dev/" },
      { property: "og:image", content: "https://kaspii-web.kaspii.workers.dev/kaspii_logo.png" },
      { property: "og:image:alt", content: "Kaspii" },
      { name: "twitter:title", content: "Kaspii — המשפחה לומדת לחסוך, יחד" },
      {
        name: "twitter:description",
        content: "הורים מגדירים משימות. ילדים צוברים מטבעות. אחוז מכל תגמול הולך אוטומטית לחיסכון.",
      },
      { name: "twitter:image", content: "https://kaspii-web.kaspii.workers.dev/kaspii_logo.png" },
    ],
    links: [{ rel: "canonical", href: "https://kaspii-web.kaspii.workers.dev/" }],
  }),
  component: Index,
});

function Index() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && role === "parent") {
      navigate({ to: "/parent/dashboard" });
    } else if (isAuthenticated && role === "child") {
      navigate({ to: "/child/dashboard" });
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <OrbitalLoader />
      </main>
    );
  }

  if (isAuthenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <AuthLoader title="מכינים את החשבון שלכם..." subtitle="רגע אחד, מעבירים אתכם למסך שלכם" />
      </main>
    );
  }

  return <LandingPage />;
}
