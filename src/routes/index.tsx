import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
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
      { property: "og:url", content: "https://kidcoin.app/" },
      { name: "twitter:title", content: "Kaspii — המשפחה לומדת לחסוך, יחד" },
      {
        name: "twitter:description",
        content: "הורים מגדירים משימות. ילדים צוברים מטבעות. אחוז מכל תגמול הולך אוטומטית לחיסכון.",
      },
    ],
    links: [{ rel: "canonical", href: "https://kidcoin.app/" }],
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
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">טוען...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">מעביר...</div>
      </div>
    );
  }

  return <LandingPage />;
}
