import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { AreaChart } from '@/components/AreaChart';
import { LeaderboardItem } from '@/components/LeaderboardItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageVirtualizer } from '@/hooks/use-page-virtualizer';
import {
	fetchGameLeaderboard,
	fetchMainStatistics,
	fetchOnlineCount,
	fetchStatistic,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type {
	ActivityPointsData,
	AuraData,
	AvatarWearableData,
	LeaderboardEntry,
	MainStatisticsData,
	OnlineTimePoint,
	StatisticsTotals,
	TopJailEntry,
	TopOnlineEntry,
} from '@/types/api';

// ── Virtual row types ────────────────────────────────────────

type StatVirtualRow =
	| { kind: 'section-header'; title: string; sectionId: string }
	| {
			kind: 'entry';
			userId: number;
			username: string;
			sex: string;
			skinTone: number;
			wearables: AvatarWearableData[];
			aura?: AuraData;
			rank: number;
			value: number;
			valueLabel?: string;
			formattedValue?: string;
		}
	| { kind: 'empty'; text: string }
	| { kind: 'loading' };

interface NormalizableEntry {
	userId?: number;
	id?: number;
	username: string;
	sex: string;
	skinTone: number;
	wearables?: AvatarWearableData[];
	aura?: AuraData;
}

function addLeaderboardRows<T extends NormalizableEntry>(
	rows: StatVirtualRow[],
	entries: T[] | undefined,
	loading: boolean,
	emptyText: string,
	getValue: (e: T) => number,
	options?: { valueLabel?: string; formatValue?: (v: number, e: T) => string },
) {
	if (loading) {
		rows.push({ kind: 'loading' });
		return;
	}
	if (!entries || entries.length === 0) {
		rows.push({ kind: 'empty', text: emptyText });
		return;
	}
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i]!;
		const value = getValue(e);
		rows.push({
			kind: 'entry',
			userId: e.userId ?? e.id ?? 0,
			username: e.username,
			sex: e.sex,
			skinTone: e.skinTone,
			wearables: e.wearables ?? [],
			aura: e.aura,
			rank: i,
			value,
			valueLabel: options?.valueLabel,
			formattedValue: options?.formatValue?.(value, e),
		});
	}
}

// ── Helpers ──────────────────────────────────────────────────

function formatTime(hours: number, minutes: number): string {
	if (hours === 0 && minutes === 0) return '0t';
	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}t`;
	return `${hours}t ${minutes}m`;
}

function LimitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-20 text-xs">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="10">Top 10</SelectItem>
				<SelectItem value="25">Top 25</SelectItem>
				<SelectItem value="50">Top 50</SelectItem>
				<SelectItem value="100">Top 100</SelectItem>
			</SelectContent>
		</Select>
	);
}

function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-24 text-xs">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="hour">Time</SelectItem>
				<SelectItem value="day">Dag</SelectItem>
				<SelectItem value="month">Måned</SelectItem>
				<SelectItem value="year">År</SelectItem>
			</SelectContent>
		</Select>
	);
}

const DEFAULT_CHART_LIMITS: Record<string, string> = {
	hour: '24',
	day: '90',
	month: '12',
	year: '5',
};

function LoadingRows({ count = 5 }: { count?: number }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={i} className="h-8 w-full" />
			))}
		</div>
	);
}

function EmptyState({ text = 'Ingen data' }: { text?: string }) {
	return <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>;
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
			<span>{title}</span>
			{children}
		</div>
	);
}

// ── Shared virtual list ──────────────────────────────────────

function StatVirtualList({
	rows,
	renderControls,
}: {
	rows: StatVirtualRow[];
	renderControls?: (sectionId: string) => React.ReactNode;
}) {
	const estimateSize = useCallback(
		(index: number) => {
			const row = rows[index];
			if (!row) return 36;
			switch (row.kind) {
				case 'section-header':
					return 40;
				case 'entry':
					return 36;
				case 'empty':
					return 48;
				case 'loading':
					return 200;
			}
		},
		[rows],
	);

	const { virtualizer, virtualItems, containerRef, paddingTop, paddingBottom } =
		usePageVirtualizer({ count: rows.length, estimateSize, overscan: 15 });

	if (rows.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
		>
			<div
				style={{
					paddingTop: paddingTop > 0 ? paddingTop : 0,
					paddingBottom: paddingBottom > 0 ? paddingBottom : 0,
				}}
			>
				{virtualItems.map((vi) => {
					const row = rows[vi.index]!;
					return (
						<div key={vi.key} data-index={vi.index} ref={virtualizer.measureElement}>
							{row.kind === 'section-header' && (
								<SectionHeader title={row.title}>
									{renderControls?.(row.sectionId)}
								</SectionHeader>
							)}
							{row.kind === 'entry' && (
								<LeaderboardItem
									index={row.rank}
									userId={row.userId}
									username={row.username}
									sex={row.sex}
									skinTone={row.skinTone}
									wearables={row.wearables}
									aura={row.aura}
									value={row.value}
									valueLabel={row.valueLabel}
									formatValue={
										row.formattedValue !== undefined
											? () => row.formattedValue!
											: undefined
									}
								/>
							)}
							{row.kind === 'empty' && (
								<div className="px-3 py-3">
									<EmptyState text={row.text} />
								</div>
							)}
							{row.kind === 'loading' && (
								<div className="px-3 py-3">
									<LoadingRows />
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ── Route-based Tab Content ──────────────────────────────────

export function StatisticsTabContent({ tab }: { tab: string }) {
	const { data: mainStats, isLoading: mainLoading } = useQuery({
		queryKey: queryKeys.mainStatistics(),
		queryFn: fetchMainStatistics,
		retry: 1,
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
	});

	switch (tab) {
		case 'generelt':
			return <OverviewTab mainStats={mainStats} mainLoading={mainLoading} />;
		case 'onlinetid':
			return (
				<OnlineTimeTab
					active={true}
					topOnline={mainStats?.topOnline}
					loading={mainLoading}
				/>
			);
		case 'faengselstid':
			return <JailTab topJail={mainStats?.topJail} loading={mainLoading} />;
		case 'lyn':
			return (
				<ActivityTab
					active={true}
					activityPoints={mainStats?.activityPoints}
					loading={mainLoading}
				/>
			);
		case 'beskeder':
			return <MessagesTab active={true} />;
		case 'bedrifter':
			return <AvatarLeaderboard type="top-achievements" title="Bedrifter" active={true} />;
		case 'missioner':
			return <AvatarLeaderboard type="top-quests" title="Missioner" active={true} />;
		case 'spil':
			return <GamesTab active={true} />;
		default:
			return null;
	}
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({
	mainStats,
	mainLoading,
}: {
	mainStats?: MainStatisticsData;
	mainLoading: boolean;
}) {
	const [selectedMetric, setSelectedMetric] = useState('coins');
	const [chartPeriod, setChartPeriod] = useState('day');

	const { data: onlineCount, isLoading: onlineLoading } = useQuery({
		queryKey: queryKeys.onlineCount(),
		queryFn: fetchOnlineCount,
		refetchInterval: 30_000,
	});

	const { data: totals, isLoading: totalsLoading } = useQuery({
		queryKey: ['statistic', 'totals', chartPeriod],
		queryFn: () =>
			fetchStatistic<StatisticsTotals[]>('totals', {
				limit: DEFAULT_CHART_LIMITS[chartPeriod] ?? '90',
				period: chartPeriod,
			}),
	});

	const latestTotals =
		Array.isArray(totals) && totals.length > 0 ? totals[totals.length - 1] : null;

	const sv = {
		totalUsers: mainStats?.totalUsers ?? latestTotals?.totalUsers,
		totalCoins: mainStats?.totalCoins ?? latestTotals?.totalCoins,
		totalItems: mainStats?.totalItems ?? latestTotals?.totalItems,
		totalUserWearables: mainStats?.totalUserWearables ?? latestTotals?.totalUserWearables,
		totalMessages: mainStats?.totalMessages ?? latestTotals?.totalMessages,
	};
	const statsLoading = mainLoading && totalsLoading;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				<StatCard
					label="Online nu"
					value={onlineCount != null ? onlineCount.toLocaleString('da-DK') : null}
					loading={onlineLoading}
					color="emerald"
				/>
				<StatCard
					label="Brugere"
					value={sv.totalUsers?.toLocaleString('da-DK') ?? null}
					loading={statsLoading}
				/>
				<StatCard
					label="Skyer"
					value={sv.totalCoins?.toLocaleString('da-DK') ?? null}
					loading={statsLoading}
				/>
				<StatCard
					label="Ting"
					value={sv.totalItems?.toLocaleString('da-DK') ?? null}
					loading={statsLoading}
				/>
				<StatCard
					label="Tøj"
					value={sv.totalUserWearables?.toLocaleString('da-DK') ?? null}
					loading={statsLoading}
				/>
				<StatCard
					label="Beskeder"
					value={sv.totalMessages?.toLocaleString('da-DK') ?? null}
					loading={statsLoading}
				/>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Udvikling over tid</CardTitle>
						<div className="flex gap-2">
							<PeriodSelect value={chartPeriod} onChange={setChartPeriod} />
							<Select value={selectedMetric} onValueChange={setSelectedMetric}>
								<SelectTrigger className="w-28 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="coins">Skyer</SelectItem>
									<SelectItem value="items">Ting</SelectItem>
									<SelectItem value="wearables">Tøj</SelectItem>
									<SelectItem value="messages">Beskeder</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{totalsLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !totals || totals.length < 2 ? (
						<EmptyState />
					) : (
						<TotalsChart data={totals} metric={selectedMetric} />
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// ── Online Time Tab ──────────────────────────────────────────

function OnlineTimeTab({
	active,
	topOnline,
	loading,
}: {
	active: boolean;
	topOnline?: TopOnlineEntry[];
	loading: boolean;
}) {
	const [chartPeriod, setChartPeriod] = useState('month');
	const [limit, setLimit] = useState('25');

	const { data: chartData, isLoading: chartLoading } = useQuery({
		queryKey: ['statistic', 'online-time', chartPeriod],
		queryFn: () =>
			fetchStatistic<OnlineTimePoint[]>('online-time', {
				limit: DEFAULT_CHART_LIMITS[chartPeriod] ?? '30',
				period: chartPeriod,
			}),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	const shown = useMemo(
		() => topOnline?.slice(0, parseInt(limit)),
		[topOnline, limit],
	);

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];
		r.push({ kind: 'section-header', title: 'Top Online', sectionId: 'top-online' });
		addLeaderboardRows(
			r,
			shown,
			loading,
			'Ingen data',
			(e: TopOnlineEntry) => e.onlineTime.hours * 60 + e.onlineTime.minutes,
			{
				formatValue: (_, e: TopOnlineEntry) =>
					formatTime(e.onlineTime.hours, e.onlineTime.minutes),
			},
		);
		return r;
	}, [shown, loading]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Online-tid</CardTitle>
						<PeriodSelect value={chartPeriod} onChange={setChartPeriod} />
					</div>
				</CardHeader>
				<CardContent>
					{chartLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !chartData || chartData.length === 0 ? (
						<EmptyState />
					) : (
						<AreaChart
							data={chartData}
							valueKey="hours"
							color="#38bdf8"
							formatLabel={(v) => `${v.toFixed(1)}t`}
							tooltipFormatter={(v) =>
								v === 1 ? '1 time' : `${v.toLocaleString('da-DK')} timer`
							}
						/>
					)}
				</CardContent>
			</Card>

			<StatVirtualList
				rows={rows}
				renderControls={() => <LimitSelect value={limit} onChange={setLimit} />}
			/>
		</div>
	);
}

// ── Jail Tab ─────────────────────────────────────────────────

function JailTab({ topJail, loading }: { topJail?: TopJailEntry[]; loading: boolean }) {
	const [limit, setLimit] = useState('25');
	const shown = useMemo(
		() => topJail?.slice(0, parseInt(limit)),
		[topJail, limit],
	);

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];
		r.push({ kind: 'section-header', title: 'Fængselstid', sectionId: 'top-jail' });
		addLeaderboardRows(
			r,
			shown,
			loading,
			'Ingen brugere med registreret fængselstid',
			(e: TopJailEntry) => e.jailTime.hours * 60 + e.jailTime.minutes,
			{
				formatValue: (_, e: TopJailEntry) =>
					formatTime(e.jailTime.hours, e.jailTime.minutes),
			},
		);
		return r;
	}, [shown, loading]);

	return (
		<StatVirtualList
			rows={rows}
			renderControls={() => <LimitSelect value={limit} onChange={setLimit} />}
		/>
	);
}

// ── Activity Tab ─────────────────────────────────────────────

function ActivityTab({
	active,
	activityPoints,
	loading,
}: {
	active: boolean;
	activityPoints?: ActivityPointsData;
	loading: boolean;
}) {
	const [limits, setLimits] = useState<Record<string, string>>({});
	const getLimit = useCallback((id: string) => limits[id] ?? '25', [limits]);
	const setLimit = useCallback(
		(id: string, v: string) => setLimits((prev) => ({ ...prev, [id]: v })),
		[],
	);

	const [dailyLimit, setDailyLimit] = useState('25');

	const { data: dailyData, isLoading: dailyLoading } = useQuery({
		queryKey: ['statistic', 'activity-points', dailyLimit],
		queryFn: () => fetchStatistic<LeaderboardEntry[]>('activity-points', { limit: dailyLimit }),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];

		const sections = [
			{ id: 'allTime', title: 'Top (Altid)', data: activityPoints?.allTime?.leaderboard, empty: 'Ingen aktivitetspoint endnu' },
			{ id: 'weekly', title: 'Top (Uge)', data: activityPoints?.weekly?.leaderboard, empty: 'Ingen aktivitetspoint denne uge endnu' },
			{ id: 'monthly', title: 'Top (Måned)', data: activityPoints?.monthly?.leaderboard, empty: 'Ingen aktivitetspoint denne måned endnu' },
			{ id: 'yearly', title: 'Top (År)', data: activityPoints?.yearly?.leaderboard, empty: 'Ingen aktivitetspoint i år endnu' },
			{ id: 'daily', title: 'Top (I dag)', data: activityPoints?.daily?.leaderboard, empty: 'Ingen aktivitetspoint i dag endnu' },
		] as const;

		for (const section of sections) {
			r.push({ kind: 'section-header', title: section.title, sectionId: section.id });
			const sliced = section.data?.slice(0, parseInt(getLimit(section.id)));
			addLeaderboardRows(r, sliced, loading, section.empty, (e) => e.points, {
				valueLabel: 'lyn',
			});
		}

		// Daily top (separate query)
		r.push({ kind: 'section-header', title: 'Top (Én Dag)', sectionId: 'dailyTop' });
		addLeaderboardRows(
			r,
			dailyData,
			dailyLoading,
			'Ingen daglige aktivitetspoint endnu',
			(e: LeaderboardEntry) => e.points ?? e.count ?? 0,
			{
				valueLabel: 'lyn',
				formatValue: (v: number, e: LeaderboardEntry) => {
					const dateStr = e.date
						? ` (${new Date(e.date).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' })})`
						: '';
					return `${v.toLocaleString('da-DK')}${dateStr}`;
				},
			},
		);

		return r;
	}, [activityPoints, loading, dailyData, dailyLoading, getLimit]);

	const renderControls = useCallback(
		(sectionId: string) => {
			if (sectionId === 'dailyTop') {
				return <LimitSelect value={dailyLimit} onChange={setDailyLimit} />;
			}
			return (
				<LimitSelect
					value={getLimit(sectionId)}
					onChange={(v) => setLimit(sectionId, v)}
				/>
			);
		},
		[getLimit, dailyLimit, setLimit],
	);

	return <StatVirtualList rows={rows} renderControls={renderControls} />;
}

// ── Messages Tab ─────────────────────────────────────────────

function MessagesTab({ active }: { active: boolean }) {
	const [chartPeriod, setChartPeriod] = useState('month');
	const [limit, setLimit] = useState('25');

	const { data: chartData, isLoading: chartLoading } = useQuery({
		queryKey: ['statistic', 'messages-chart', chartPeriod],
		queryFn: () =>
			fetchStatistic<{ period: string; count: number }[]>('messages-chart', {
				limit: DEFAULT_CHART_LIMITS[chartPeriod] ?? '30',
				period: chartPeriod,
			}),
		enabled: active,
		retry: 1,
		placeholderData: keepPreviousData,
	});

	const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
		queryKey: ['statistic', 'top-messages', limit],
		queryFn: () => fetchStatistic<LeaderboardEntry[]>('top-messages', { limit }),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];
		r.push({ kind: 'section-header', title: 'Top Afsendere', sectionId: 'top-messages' });
		addLeaderboardRows(
			r,
			leaderboard,
			leaderboardLoading,
			'Ingen data',
			(e: LeaderboardEntry) => e.count ?? e.points ?? 0,
		);
		return r;
	}, [leaderboard, leaderboardLoading]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Beskeder over tid</CardTitle>
						<PeriodSelect value={chartPeriod} onChange={setChartPeriod} />
					</div>
				</CardHeader>
				<CardContent>
					{chartLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !chartData || chartData.length === 0 ? (
						<EmptyState />
					) : (
						<AreaChart
							data={chartData}
							valueKey="count"
							color="#8b5cf6"
							tooltipFormatter={(v) =>
								v === 1 ? '1 besked' : `${v.toLocaleString('da-DK')} beskeder`
							}
						/>
					)}
				</CardContent>
			</Card>

			<StatVirtualList
				rows={rows}
				renderControls={() => <LimitSelect value={limit} onChange={setLimit} />}
			/>
		</div>
	);
}

// ── Avatar Leaderboard (for achievements, quests) ────────────

function AvatarLeaderboard({
	type,
	title,
	valueLabel,
	active,
	formatValue,
	valueField = 'count',
}: {
	type: string;
	title: string;
	valueLabel?: string;
	active: boolean;
	formatValue?: (v: number) => string;
	valueField?: 'count' | 'points';
}) {
	const [limit, setLimit] = useState('25');

	const { data, isLoading } = useQuery({
		queryKey: ['statistic', type, limit],
		queryFn: () => fetchStatistic<LeaderboardEntry[]>(type, { limit }),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];
		r.push({ kind: 'section-header', title, sectionId: type });
		addLeaderboardRows(
			r,
			data,
			isLoading,
			'Ingen data',
			(e: LeaderboardEntry) =>
				valueField === 'points'
					? (e.points ?? e.count ?? 0)
					: (e.count ?? e.points ?? 0),
			{
				valueLabel,
				formatValue: formatValue ? (v) => formatValue(v) : undefined,
			},
		);
		return r;
	}, [data, isLoading, title, type, valueField, valueLabel, formatValue]);

	return (
		<StatVirtualList
			rows={rows}
			renderControls={() => <LimitSelect value={limit} onChange={setLimit} />}
		/>
	);
}

// ── Games Tab ────────────────────────────────────────────────

function GamesTab({ active }: { active: boolean }) {
	const [gameType, setGameType] = useState<'ludo' | 'poker'>('ludo');
	const [betMode, setBetMode] = useState<'free' | 'betting' | undefined>(undefined);
	const [limit, setLimit] = useState('25');

	const { data, isLoading } = useQuery({
		queryKey: queryKeys.gameLeaderboard(gameType, betMode, limit),
		queryFn: () => fetchGameLeaderboard(gameType, betMode, parseInt(limit)),
		enabled: active,
		placeholderData: keepPreviousData,
	});

	const rows = useMemo<StatVirtualRow[]>(() => {
		const r: StatVirtualRow[] = [];
		r.push({ kind: 'section-header', title: 'Spil', sectionId: 'games' });
		addLeaderboardRows(r, data, isLoading, 'Ingen spil afsluttet endnu', (e) => e.wins, {
			valueLabel: 'sejre',
		});
		return r;
	}, [data, isLoading]);

	return (
		<StatVirtualList
			rows={rows}
			renderControls={() => (
				<div className="flex gap-2">
					<Select
						value={gameType}
						onValueChange={(v) => setGameType(v as 'ludo' | 'poker')}
					>
						<SelectTrigger className="w-20 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ludo">Ludo</SelectItem>
							<SelectItem value="poker">Poker</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={betMode ?? '_all'}
						onValueChange={(v) =>
							setBetMode(v === '_all' ? undefined : (v as 'free' | 'betting'))
						}
					>
						<SelectTrigger className="w-24 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="_all">Alle</SelectItem>
							<SelectItem value="free">Gratis</SelectItem>
							<SelectItem value="betting">Indsats</SelectItem>
						</SelectContent>
					</Select>
					<LimitSelect value={limit} onChange={setLimit} />
				</div>
			)}
		/>
	);
}

// ── Totals Chart ─────────────────────────────────────────────

const METRIC_MAP: Record<string, { key: keyof StatisticsTotals; label: string; color: string }> = {
	coins: { key: 'totalCoins', label: 'skyer', color: '#3b82f6' },
	items: { key: 'totalItems', label: 'ting', color: '#f59e0b' },
	wearables: { key: 'totalUserWearables', label: 'tøj', color: '#10b981' },
	messages: { key: 'totalMessages', label: 'beskeder', color: '#8b5cf6' },
};

function TotalsChart({ data, metric }: { data: StatisticsTotals[]; metric: string }) {
	const m = METRIC_MAP[metric] ?? METRIC_MAP.coins!;
	const chartData = data.map((d) => ({ date: d.date, value: Number(d[m.key]) }));
	return (
		<AreaChart
			data={chartData}
			valueKey="value"
			dateKey="date"
			color={m.color}
			tooltipFormatter={(v) => `${v.toLocaleString('da-DK')} ${m.label}`}
		/>
	);
}

// ── Stat Card ────────────────────────────────────────────────

function StatCard({
	label,
	value,
	loading,
	color,
}: {
	label: string;
	value: string | null;
	loading?: boolean;
	color?: 'emerald';
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
				{loading ? (
					<Skeleton className="mt-1 h-7 w-16" />
				) : (
					<p
						className={`font-mono text-2xl font-bold ${color === 'emerald' ? 'text-emerald-500' : 'text-slate-900 dark:text-slate-100'}`}
					>
						{value ?? '—'}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
