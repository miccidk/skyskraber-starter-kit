import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getWearableSexName } from '@/lib/constants';
import type { CatalogCategory } from '@/types/api';

export interface CatalogFilterValues {
	search: string;
	kind: 'all' | 'item' | 'wearable';
	type: string;
	sex: string;
	category: string;
	sort: 'name' | 'count-desc' | 'count-asc' | 'level';
}

interface CatalogFiltersProps {
	values: CatalogFilterValues;
	onChange: (values: CatalogFilterValues) => void;
	typeOptions: { value: string; label: string }[];
	categories: CatalogCategory[];
}

export function CatalogFilters({ values, onChange, typeOptions, categories }: CatalogFiltersProps) {
	function update(partial: Partial<CatalogFilterValues>) {
		onChange({ ...values, ...partial });
	}

	const showKindFilters = values.kind !== 'all';
	const showSexFilter = values.kind === 'wearable';

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			<div className="relative col-span-2">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
				<Input
					placeholder="Søg efter navn..."
					value={values.search}
					onChange={(e) => update({ search: e.target.value })}
					className="pl-9"
					aria-label="Søg i katalog"
				/>
			</div>
			<Select
				value={values.kind}
				onValueChange={(v) => update({ kind: v as CatalogFilterValues['kind'] })}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">Alle</SelectItem>
					<SelectItem value="item">Ting</SelectItem>
					<SelectItem value="wearable">Tøj</SelectItem>
				</SelectContent>
			</Select>
			<Select
				value={values.sort}
				onValueChange={(v) => update({ sort: v as CatalogFilterValues['sort'] })}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="name">Navn</SelectItem>
					<SelectItem value="count-desc">Antal (flest)</SelectItem>
					<SelectItem value="count-asc">Antal (færrest)</SelectItem>
					<SelectItem value="level">Level (højest)</SelectItem>
				</SelectContent>
			</Select>
			{showKindFilters && typeOptions.length > 0 && (
				<Select
					value={values.type || '_all'}
					onValueChange={(v) => update({ type: v === '_all' ? '' : v })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_all">Alle typer</SelectItem>
						{typeOptions.map((t) => (
							<SelectItem key={t.value} value={t.value}>
								{t.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			{showSexFilter && (
				<Select
					value={values.sex || '_all'}
					onValueChange={(v) => update({ sex: v === '_all' ? '' : v })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_all">Alle køn</SelectItem>
						<SelectItem value="male">{getWearableSexName('male')}</SelectItem>
						<SelectItem value="female">{getWearableSexName('female')}</SelectItem>
						<SelectItem value="unisex">{getWearableSexName('unisex')}</SelectItem>
					</SelectContent>
				</Select>
			)}
			{showKindFilters && categories.length > 0 && (
				<Select
					value={values.category || '_all'}
					onValueChange={(v) => update({ category: v === '_all' ? '' : v })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="_all">Alle kategorier</SelectItem>
						{categories.map((c) => (
							<SelectItem key={c.id} value={String(c.id)}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	);
}
