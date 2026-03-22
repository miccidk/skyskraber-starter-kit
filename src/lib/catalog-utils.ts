import type { CatalogEntry, CatalogItemType, CatalogWearableType } from '@/types/api';

export function toItemEntry(i: CatalogItemType): CatalogEntry {
	return {
		id: i.id,
		name: i.name,
		kind: 'item',
		type: i.type,
		level: i.level,
		categoryId: i.categoryId,
		categoryName: i.categoryName,
		totalCount: i.totalCount,
		images: i.images,
		resellPrice: i.resellPrice,
		isTradable: i.isTradable,
	};
}

export function toWearableEntry(w: CatalogWearableType): CatalogEntry {
	return {
		id: w.id,
		name: w.name,
		kind: 'wearable',
		type: w.type,
		level: w.level,
		categoryId: w.categoryId,
		categoryName: w.categoryName,
		totalCount: w.totalCount,
		sex: w.sex,
		images: w.images,
		resellPrice: w.resellPrice,
		isTradable: w.isTradable,
	};
}
