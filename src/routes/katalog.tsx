import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/katalog')({
	component: KatalogLayout,
});

function KatalogLayout() {
	return <Outlet />;
}
