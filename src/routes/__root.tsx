import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">הדף לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          הדף שחיפשת לא קיים או הועבר.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kaspi" },
      { name: "description", content: "מערכת פיננסית למשפחות הכוללת 
 הורים מגדירים משימות, ילדים צוברים מטבעות
ילדים לומדים לחסוך כסף בעזרת מטלות הבית" },
      { property: "og:title", content: "Kaspi" },
      { name: "twitter:title", content: "Kaspi" },
      { property: "og:description", content: "מערכת פיננסית למשפחות הכוללת 
 הורים מגדירים משימות, ילדים צוברים מטבעות
ילדים לומדים לחסוך כסף בעזרת מטלות הבית" },
      { name: "twitter:description", content: "מערכת פיננסית למשפחות הכוללת 
 הורים מגדירים משימות, ילדים צוברים מטבעות
ילדים לומדים לחסוך כסף בעזרת מטלות הבית" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/60b718b7-4bc7-420d-9e27-8898ba9a56d4/id-preview-6c1e960f--2e61ed90-5829-4525-936e-0937c917252a.lovable.app-1777573398986.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/60b718b7-4bc7-420d-9e27-8898ba9a56d4/id-preview-6c1e960f--2e61ed90-5829-4525-936e-0937c917252a.lovable.app-1777573398986.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap" },
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
      <Outlet />
      <Toaster richColors closeButton position="top-center" dir="rtl" />
    </AuthProvider>
  );
}
