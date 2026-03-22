import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink, History, TrendingUp } from 'lucide-react';

import { AreaChart } from '@/components/AreaChart';
import { InfoCard } from '@/components/InfoCard';
import { ItemCanvas } from '@/components/ItemCanvas';
import { Seo } from '@/components/Seo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
	fetchCatalog,
	fetchCatalogCountChart,
	fetchMarketPrice,
	fetchSalesHistory,
} from '@/lib/api';
import { toItemEntry, toWearableEntry } from '@/lib/catalog-utils';
import { getItemTypeName, getWearableSexName, getWearableTypeName } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import type { CatalogEntry } from '@/types/api';

export const Route = createFileRoute('/katalog/$kind/$typeId')({
	component: KatalogDetailPage,
	remountDeps: (opts) => [opts.params.kind, opts.params.typeId],
});

function KatalogDetailPage() {
	const { kind, typeId: typeIdStr } = Route.useParams();
	const typeId = Number(typeIdStr);
	const itemType = kind as 'item' | 'wearable';

	const { data: catalog } = useQuery({
		queryKey: queryKeys.catalog(),
		queryFn: fetchCatalog,
		staleTime: 300_000,
	});

	// Find the item in the cached catalog
	const entry: CatalogEntry | undefined = (() => {
		if (!catalog) return undefined;
		if (kind === 'item') {
			const item = catalog.items.find((i) => i.id === typeId);
			return item ? toItemEntry(item) : undefined;
		}
		const wearable = catalog.wearables.find((w) => w.id === typeId);
		return wearable ? toWearableEntry(wearable) : undefined;
	})();

	const { data: price, isLoading: priceLoading } = useQuery({
		queryKey: queryKeys.marketPrice(itemType, typeId),
		queryFn: () => fetchMarketPrice(itemType, typeId),
		enabled: !!entry,
	});

	const { data: history, isLoading: historyLoading } = useQuery({
		queryKey: queryKeys.salesHistory(itemType, typeId, 1),
		queryFn: () => fetchSalesHistory(itemType, typeId, 1),
		enabled: !!entry,
	});

	const { data: countChart, isLoading: countChartLoading } = useQuery({
		queryKey: queryKeys.catalogCountChart(itemType, typeId, 90),
		queryFn: () => fetchCatalogCountChart(itemType, typeId, 90),
		enabled: !!entry,
	});

	const sales = history?.data ?? [];

	if (!catalog) {
		return (
			<>
				<div className="space-y-4">
					<Skeleton className="h-8 w-48" />
					<div className="flex flex-col sm:flex-row gap-6">
						<Skeleton className="h-44 w-44 rounded-lg flex-shrink-0" />
						<div className="flex-1 space-y-3">
							<Skeleton className="h-8 w-64" />
							<Skeleton className="h-4 w-40" />
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								<Skeleton className="h-16 rounded-lg" />
								<Skeleton className="h-16 rounded-lg" />
								<Skeleton className="h-16 rounded-lg" />
							</div>
						</div>
					</div>
					<Skeleton className="h-48 w-full rounded-lg" />
					<Skeleton className="h-36 w-full rounded-lg" />
				</div>
			</>
		);
	}

	if (!entry) {
		return (
			<>
				<div className="space-y-4">
					<Link
						to="/katalog"
						className="inline-flex items-center gap-1 text-sm text-sky-500"
					>
						<ArrowLeft className="h-4 w-4" />
						Tilbage til katalog
					</Link>
					<p className="text-slate-500 dark:text-slate-400">
						Kunne ikke finde denne genstand i kataloget.
					</p>
				</div>
			</>
		);
	}

	const typeName =
		entry.kind === 'item' ? getItemTypeName(entry.type) : getWearableTypeName(entry.type);

	return (
		<div className="space-y-6">
			<Seo
				title={`${entry.name} — Skyskraber Katalog`}
				description={`Se markedspris, antal og salgshistorik for ${entry.name} i Skyskraber. ${typeName}${entry.categoryName ? ` · ${entry.categoryName}` : ''}.`}
			/>
			<Link
				to="/katalog"
				className="inline-flex items-center gap-1 text-sm text-sky-500 hover:underline"
			>
				<ArrowLeft className="h-4 w-4" />
				Tilbage til katalog
			</Link>

			<div className="flex flex-col sm:flex-row gap-6">
				{/* Image */}
				<div className="flex justify-center sm:justify-start flex-shrink-0">
					<Card>
						<CardContent className="p-4">
							<ItemCanvas images={entry.images} type={entry.type} size={160} />
						</CardContent>
					</Card>
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0 space-y-3">
					<div>
						<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
							{entry.name}
						</h1>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							{typeName}
							{entry.categoryName ? ` · ${entry.categoryName}` : ''}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<InfoCard
							label="Antal i spillet"
							value={entry.totalCount.toLocaleString('da-DK')}
						/>
						{priceLoading ? (
							<div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
								<Skeleton className="h-4 w-16 mb-1" />
								<Skeleton className="h-6 w-24" />
							</div>
						) : price?.avg_price != null && price.avg_price > 0 ? (
							<InfoCard
								label="Markedspris"
								value={`${price.avg_price.toLocaleString('da-DK')} skyer`}
							/>
						) : (
							<InfoCard label="Markedspris" value="—" />
						)}
						{entry.resellPrice != null && entry.resellPrice > 0 && (
							<InfoCard
								label="Gensalgspris"
								value={`${entry.resellPrice.toLocaleString('da-DK')} skyer`}
							/>
						)}
						{entry.level > 0 && <InfoCard label="Level" value={String(entry.level)} />}
						{entry.kind === 'wearable' && entry.sex && (
							<InfoCard label="Køn" value={getWearableSexName(entry.sex)} />
						)}
						{entry.isTradable != null && (
							<InfoCard label="Kan byttes" value={entry.isTradable ? 'Ja' : 'Nej'} />
						)}
					</div>

					<a
						href="https://www.skyskraber.dk"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:underline"
					>
						Se i Skyskraber
						<ExternalLink className="h-3.5 w-3.5" />
					</a>
				</div>
			</div>

			{/* Sales History */}
			<Card>
				<CardContent className="p-4 space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
							<History className="h-4 w-4 text-sky-500" />
							Salgshistorik
						</h2>
						{sales.length > 0 && (
							<Badge variant="outline" className="text-[10px] font-normal">
								Sidste {sales.length} salg
							</Badge>
						)}
					</div>
					{historyLoading ? (
						<Skeleton className="h-48 w-full" />
					) : sales.length === 0 ? (
						<div className="h-36 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
							<History className="h-8 w-8 mb-2 opacity-20" />
							<p className="text-xs">Ingen salgshistorik tilgængelig</p>
						</div>
					) : (
						<AreaChart
							data={[...sales].sort(
								(a, b) => new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime(),
							)}
							valueKey="salePrice"
							dateKey="soldAt"
							color="#38bdf8"
							showDots
							tooltipFormatter={(v) => `${v.toLocaleString('da-DK')} skyer`}
						/>
					)}
				</CardContent>
			</Card>

			{/* Count History */}
			<Card>
				<CardContent className="p-4 space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
							<TrendingUp className="h-4 w-4 text-emerald-500" />
							Antal i spillet over tid
						</h2>
						{countChart && countChart.length > 0 && (
							<Badge variant="outline" className="text-[10px] font-normal">
								Sidste {countChart.length} dage
							</Badge>
						)}
					</div>
					{countChartLoading ? (
						<Skeleton className="h-36 w-full" />
					) : !countChart || countChart.length === 0 ? (
						<div className="h-28 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400">
							<TrendingUp className="h-8 w-8 mb-2 opacity-20" />
							<p className="text-xs">Ingen historik tilgængelig endnu</p>
						</div>
					) : (
						<AreaChart
							data={countChart}
							valueKey="totalCount"
							dateKey="date"
							color="#22c55e"
							tooltipFormatter={(v) => v.toLocaleString('da-DK')}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

