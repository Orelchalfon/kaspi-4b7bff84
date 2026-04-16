import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/parent/children")({
  component: ChildrenLayout,
});

function ChildrenLayout() {
  return <Outlet />;
}
