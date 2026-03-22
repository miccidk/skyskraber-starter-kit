import { createFileRoute, Navigate } from '@tanstack/react-router';

import { Seo } from '@/components/Seo';
import { StatisticsTabContent } from '@/components/StatisticsDashboard';

const VALID_TABS = new Set([
	'generelt',
	'onlinetid',
	'faengselstid',
	'lyn',
	'beskeder',
	'bedrifter',
	'missioner',
	'spil',
]);

const TAB_LABELS: Record<string, string> = {
	generelt: 'Generelt',
	onlinetid: 'Onlinetid',
	faengselstid: 'Fængselstid',
	lyn: 'Aktivitetspoint',
	beskeder: 'Beskeder',
	bedrifter: 'Bedrifter',
	missioner: 'Missioner',
	spil: 'Spil',
};

export const Route = createFileRoute('/statistik/$tab')({
	component: StatistikTabPage,
	remountDeps: (opts) => [opts.params.tab],
});

function StatistikTabPage() {
	const { tab } = Route.useParams();

	if (!VALID_TABS.has(tab)) {
		return <Navigate to="/statistik/$tab" params={{ tab: 'generelt' }} />;
	}

	const label = TAB_LABELS[tab] ?? tab;

	return (
		<>
			<Seo
				title={`${label} Statistik — Skyskraber`}
				description={`Se ${label.toLowerCase()} statistik og leaderboards for Skyskraber.`}
			/>
			<StatisticsTabContent tab={tab} />
		</>
	);
}
