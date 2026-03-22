import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';

import { CatalogFilters, type CatalogFilterValues } from '@/components/CatalogFilters';
import { ItemCanvas } from '@/components/ItemCanvas';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageVirtualizer } from '@/hooks/use-page-virtualizer';
import { fetchCatalog } from '@/lib/api';
import { toItemEntry, toWearableEntry } from '@/lib/catalog-utils';
import { getItemTypeName, getWearableTypeName } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import type { CatalogCategory, CatalogEntry } from '@/types/api';

function translateType(entry: CatalogEntry): string {
	return entry.kind === 'item' ? getItemTypeName(entry.type) : getWearableTypeName(entry.type);
}

export function CatalogBrowser() {
	const { data: catalog, isLoading } = useQuery({
		queryKey: queryKeys.catalog(),
		queryFn: fetchCatalog,
		staleTime: 300_000,
	});

	const [filters, setFilters] = useState<CatalogFilterValues>({
		search: '',
		kind: 'all',
		type: '',
		sex: '',
		category: '',
		sort: 'name',
	});

	const allEntries = useMemo<CatalogEntry[]>(() => {
		if (!catalog) return [];
		return [...catalog.items.map(toItemEntry), ...catalog.wearables.map(toWearableEntry)];
	}, [catalog]);

	const typeOptions = useMemo(() => {
		if (!catalog || filters.kind === 'all') return [];
		const types =
			filters.kind === 'item'
				? [...new Set(catalog.items.map((i) => i.type))].sort()
				: [...new Set(catalog.wearables.map((w) => w.type))].sort();
		return types.map((t) => ({
			value: t,
			label: filters.kind === 'item' ? getItemTypeName(t) : getWearableTypeName(t),
		}));
	}, [catalog, filters.kind]);

	const categories = useMemo<CatalogCategory[]>(() => {
		if (!catalog) return [];
		const cats =
			filters.kind === 'wearable'
				? catalog.wearableCategories
				: filters.kind === 'item'
					? catalog.itemCategories
					: [...catalog.itemCategories, ...catalog.wearableCategories];
		const map = new Map<number, CatalogCategory>();
		for (const c of cats) map.set(c.id, c);
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
	}, [catalog, filters.kind]);

	const handleFiltersChange = useCallback((newFilters: CatalogFilterValues) => {
		setFilters((prev) => {
			if (newFilters.kind !== prev.kind) {
				return { ...newFilters, type: '', sex: '', category: '' };
			}
			return newFilters;
		});
	}, []);

	const filtered = useMemo(() => {
		let result = allEntries;

		if (filters.search) {
			const s = filters.search.toLowerCase();
			result = result.filter((e) => e.name.toLowerCase().includes(s));
		}
		if (filters.kind !== 'all') {
			result = result.filter((e) => e.kind === filters.kind);
		}
		if (filters.type) {
			result = result.filter((e) => e.type === filters.type);
		}
		if (filters.sex) {
			result = result.filter((e) => e.sex === filters.sex);
		}
		if (filters.category) {
			const categoryId = Number(filters.category);
			result = result.filter((e) => e.categoryId === categoryId);
		}

		result = [...result];
		switch (filters.sort) {
			case 'count-desc':
				result.sort((a, b) => b.totalCount - a.totalCount);
				break;
			case 'count-asc':
				result.sort((a, b) => a.totalCount - b.totalCount);
				break;
			case 'level':
				result.sort((a, b) => b.level - a.level);
				break;
			case 'name':
				result.sort((a, b) => a.name.localeCompare(b.name, 'da'));
				break;
		}

		return result;
	}, [allEntries, filters]);

	const { virtualItems, containerRef, paddingTop, paddingBottom } = usePageVirtualizer({
		count: filtered.length,
		estimateSize: () => 56,
		overscan: 15,
		gap: 2,
	});

	if (isLoading) {
		return (
			<div className="space-y-2">
				<Skeleton className="h-9 w-full" />
				{Array.from({ length: 8 }, (_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<CatalogFilters
				values={filters}
				onChange={handleFiltersChange}
				typeOptions={typeOptions}
				categories={categories}
			/>

			<div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
				{filtered.length.toLocaleString('da-DK')} typer i alt
			</div>

			<div
				ref={containerRef}
				className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
			>
				{filtered.length === 0 ? (
					<div className="flex h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
						Ingen resultater matcher dine filtre
					</div>
				) : (
					<div
						style={{
							paddingTop: paddingTop > 0 ? paddingTop : 0,
							paddingBottom: paddingBottom > 0 ? paddingBottom : 0,
						}}
					>
						{virtualItems.map((vi) => {
							const entry = filtered[vi.index]!;
							const translatedType = translateType(entry);
							const meta = [
								translatedType,
								entry.categoryName,
								entry.level > 0 ? `Lvl ${entry.level}` : null,
							]
								.filter(Boolean)
								.join(' · ');

							return (
								<Link
									key={`${entry.kind}-${entry.id}`}
									to="/katalog/$kind/$typeId"
									params={{ kind: entry.kind, typeId: String(entry.id) }}
									className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-slate-50 rounded-md transition-colors dark:hover:bg-slate-700/50 no-underline"
								>
									<div className="flex-shrink-0">
										<ItemCanvas
											images={entry.images}
											type={entry.type}
											size={36}
										/>
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-1">
											<span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
												{entry.name}
											</span>
											<span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
												{entry.totalCount.toLocaleString('da-DK')} i alt
											</span>
										</div>
										<div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
											{meta}
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
