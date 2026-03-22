import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/rum')({
	component: RumLayout,
});

function RumLayout() {
	return <Outlet />;
}
