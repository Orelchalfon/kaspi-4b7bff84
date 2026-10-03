import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Home } from "lucide-react";

import rubikHebrewWoff2 from "@fontsource-variable/rubik/files/rubik-hebrew-wght-normal.woff2?url";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">הדף לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">הדף שחיפשת לא קיים או הועבר.</p>
        <div className="mt-6">
          <Button asChild size="touch">
            <Link to="/">
              <Home aria-hidden />
              חזרה לדף הבית
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kasp — המשפחה לומדת לחסוך, יחד" },
      {
        name: "description",
        content:
          "Kasp היא סביבת תרגול משפחתית: הורים מגדירים משימות, ילדים צוברים מטבעות ואחוז מכל תגמול הולך אוטומטית לחיסכון.",
      },
      { property: "og:site_name", content: "Kasp" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      // Preloaded so Hebrew text paints in Rubik on first render instead of swapping late.
      {
        rel: "preload",
        href: rubikHebrewWoff2,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://jlpvjxywfvijntsctvaq.supabase.co",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://jlpvjxywfvijntsctvaq.supabase.co" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Kasp",
          url: "https://kasp-web.kasp.workers.dev",
          inLanguage: "he",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Kasp",
          url: "https://kasp-web.kasp.workers.dev",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      {/* No <main> here: each layout/page owns its own landmark, so the landing page's
          header/footer and the parent/child layouts' <main> aren't nested inside one. */}
      <Outlet />
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </AuthProvider>
  );
}
