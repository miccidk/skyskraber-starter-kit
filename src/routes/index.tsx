import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { AvatarThumbnail } from '@/components/AvatarThumbnail';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { fetchMainStatistics, fetchOnlineCount, fetchStatistic } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry, StatisticsTotals } from '@/types/api';

export const Route = createFileRoute('/')({
	component: HomePage,
});

function HomePage() {
	const { isAuthenticated, login } = useAuth();

	return (
		<div className="space-y-10">
			<Seo
				title="Skyskraber Starter Kit"
				description="Udforsk Skyskraber-universet med statistik, katalog, rum og mere. Fan site til skyskraber.dk."
			/>
			{/* Hero */}
			<section className="py-12 text-center">
				<h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">
					Velkommen til <span className="text-sky-blue">Skyskraber</span>
				</h1>
				<p className="mx-auto mt-4 max-w-lg text-lg text-slate-500 dark:text-slate-400">
					Udforsk statistikker, katalog, rum og meget mere fra Skyskraber-universet.
				</p>
				{!isAuthenticated && (
					<Button variant="primary" size="lg" className="mt-6 shadow-lg" onClick={login}>
						Log ind for at se din profil
					</Button>
				)}
			</section>

			{/* Live stats */}
			<LiveStats />

			{/* CTA */}
			<section className="text-center py-4">
				<a
					href="https://www.skyskraber.dk"
					target="_blank"
					rel="noopener noreferrer"
					className="text-sky-blue hover:underline text-sm font-medium"
				>
					Spil Skyskraber gratis &rarr; skyskraber.dk
				</a>
			</section>
		</div>
	);
}

function LiveStats() {
	const { data: onlineCount, isLoading: onlineLoading } = useQuery({
		queryKey: queryKeys.onlineCount(),
		queryFn: fetchOnlineCount,
		refetchInterval: 30_000,
	});

	const { data: totals, isLoading: totalsLoading } = useQuery({
		queryKey: queryKeys.statistic('totals'),
		queryFn: () => fetchStatistic<StatisticsTotals[]>('totals', { limit: '1' }),
	});

	const { data: mainStats } = useQuery({
		queryKey: queryKeys.statistic('main-overview'),
		queryFn: fetchMainStatistics,
	});

	const { data: topAchievements } = useQuery({
		queryKey: queryKeys.statistic('top-achievements'),
		queryFn: () => fetchStatistic<LeaderboardEntry[]>('top-achievements', { limit: '3' }),
	});

	const { data: topQuests } = useQuery({
		queryKey: queryKeys.statistic('top-quests'),
		queryFn: () => fetchStatistic<LeaderboardEntry[]>('top-quests', { limit: '3' }),
	});

	const { data: topActivityPoints } = useQuery({
		queryKey: queryKeys.statistic('activity-points'),
		queryFn: () => fetchStatistic<LeaderboardEntry[]>('activity-points', { limit: '3' }),
	});

	const topOnline = mainStats?.topOnline?.slice(0, 3).map((e) => ({
		userId: e.id,
		username: e.username,
		sex: e.sex,
		skinTone: e.skinTone,
		wearables: e.wearables,
		aura: e.aura,
		count: e.onlineTime.hours * 60 + e.onlineTime.minutes,
	})) as LeaderboardEntry[] | undefined;

	const latestTotals =
		Array.isArray(totals) && totals.length > 0 ? totals[totals.length - 1] : null;

	return (
		<div className="space-y-6">
			{/* Quick stats */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				<QuickStat
					label="Online nu"
					value={onlineCount}
					loading={onlineLoading}
					highlight
				/>
				<QuickStat
					label="Brugere"
					value={latestTotals?.totalUsers}
					loading={totalsLoading}
				/>
				<QuickStat label="Skyer" value={latestTotals?.totalCoins} loading={totalsLoading} />
				<QuickStat label="Ting" value={latestTotals?.totalItems} loading={totalsLoading} />
				<QuickStat
					label="Tøj"
					value={latestTotals?.totalUserWearables}
					loading={totalsLoading}
				/>
				<QuickStat
					label="Beskeder"
					value={latestTotals?.totalMessages}
					loading={totalsLoading}
				/>
			</div>

			{/* Top 3 previews with avatars */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<MiniLeaderboard
					title="Top onlinetid"
					data={topOnline}
					formatValue={(v) => {
						const h = Math.floor(v / 60);
						const m = v % 60;
						return `${h}t ${m}m`;
					}}
				/>
				<MiniLeaderboard title="Top bedrifter" data={topAchievements} />
				<MiniLeaderboard title="Top missioner" data={topQuests} />
				<MiniLeaderboard title="Top lyn" data={topActivityPoints} />
			</div>
		</div>
	);
}

function QuickStat({
	label,
	value,
	loading,
	highlight,
}: {
	label: string;
	value?: number | null;
	loading?: boolean;
	highlight?: boolean;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
				{loading ? (
					<Skeleton className="mt-1 h-7 w-16" />
				) : (
					<p
						className={`font-mono text-2xl font-bold ${highlight ? 'text-emerald-500' : 'text-slate-900 dark:text-slate-100'}`}
					>
						{value != null ? value.toLocaleString('da-DK') : '—'}
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function MiniLeaderboard({
	title,
	data,
	formatValue,
}: {
	title: string;
	data?: LeaderboardEntry[];
	formatValue?: (v: number) => string;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
					{title}
				</h3>
				{!data ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-7 w-full" />
						))}
					</div>
				) : data.length === 0 ? (
					<p className="text-xs text-slate-500 dark:text-slate-400">Ingen data</p>
				) : (
					<div className="space-y-1">
						{data.map((entry, i) => (
							<div
								key={`${entry.userId}-${i}`}
								className={cn(
									'flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors',
									'hover:bg-slate-50 dark:hover:bg-slate-700/50',
									i === 0 && 'aura-card-glow',
								)}
							>
								<span
									className={cn(
										'w-4 text-xs text-right flex-shrink-0 font-bold',
										i === 0
											? 'text-amber-500'
											: i === 1
												? 'text-gray-400 dark:text-gray-300'
												: 'text-amber-700 dark:text-amber-600',
									)}
								>
									{i + 1}.
								</span>
								{entry.wearables && entry.wearables.length > 0 ? (
									<AvatarThumbnail
										sex={entry.sex}
										skinTone={entry.skinTone}
										wearables={entry.wearables}
										aura={entry.aura}
										size={20}
									/>
								) : (
									<div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
								)}
								<span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1 min-w-0">
									{entry.username}
								</span>
								<span className="font-mono text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
									{formatValue
										? formatValue(entry.count ?? entry.points ?? 0)
										: (entry.count ?? entry.points ?? 0).toLocaleString(
												'da-DK',
											)}
								</span>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
