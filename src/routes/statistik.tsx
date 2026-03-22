import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Outlet, useMatches } from '@tanstack/react-router';

import { fetchMainStatistics } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const TABS = [
	{ tab: 'generelt', label: 'Generelt' },
	{ tab: 'onlinetid', label: 'Onlinetid' },
	{ tab: 'faengselstid', label: 'Fængselstid' },
	{ tab: 'lyn', label: 'Lyn' },
	{ tab: 'beskeder', label: 'Beskeder' },
	{ tab: 'bedrifter', label: 'Bedrifter' },
	{ tab: 'missioner', label: 'Missioner' },
	{ tab: 'spil', label: 'Spil' },
] as const;

export const Route = createFileRoute('/statistik')({
	component: StatistikLayout,
});

function StatistikLayout() {
	// Prefetch shared data at layout level so it's cached before any tab mounts
	useQuery({
		queryKey: queryKeys.mainStatistics(),
		queryFn: fetchMainStatistics,
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
	});

	const matches = useMatches();
	const lastMatch = matches[matches.length - 1];
	// Extract the current tab from route params
	const currentTab =
		lastMatch && 'tab' in lastMatch.params
			? (lastMatch.params as { tab: string }).tab
			: 'generelt';

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Statistik</h1>

			<nav className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
				{TABS.map((t) => {
					const isActive = currentTab === t.tab;
					return (
						<Link
							key={t.tab}
							to="/statistik/$tab"
							params={{ tab: t.tab }}
							className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
								isActive
									? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
									: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
							}`}
						>
							{t.label}
						</Link>
					);
				})}
			</nav>

			<Outlet />
		</div>
	);
}
