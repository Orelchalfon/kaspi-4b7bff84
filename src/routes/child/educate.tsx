import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/child/educate")({
  component: EducateLayout,
});

function EducateLayout() {
  return <Outlet />;
}
