import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { AuthSwitch, type AuthMode } from "@/components/auth/auth-switch";

// Pathless layout shared by /login and /signup. Keeping AuthSwitch mounted here (instead
// of in each route) is what lets the double-slider animate between the two URLs rather
// than remounting. The child routes only contribute their <head> meta.
export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const mode: AuthMode = pathname.startsWith("/signup") ? "signup" : "signin";

  return (
    <main className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <AuthSwitch
        mode={mode}
        // replace: rapid toggling shouldn't stack history entries; Back leaves the auth page.
        onModeChange={(next) =>
          navigate({ to: next === "signup" ? "/signup" : "/login", replace: true })
        }
      />
    </main>
  );
}
