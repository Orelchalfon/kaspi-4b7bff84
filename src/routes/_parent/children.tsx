import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_parent/children")({
  component: ChildrenLayout,
});

function ChildrenLayout() {
  return <Outlet />;
}
