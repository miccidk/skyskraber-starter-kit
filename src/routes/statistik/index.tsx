import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/statistik/')({
	component: StatistikIndex,
});

function StatistikIndex() {
	return <Navigate to="/statistik/$tab" params={{ tab: 'generelt' }} />;
}
