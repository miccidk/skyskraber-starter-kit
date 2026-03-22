import { memo } from 'react';

import { AvatarThumbnail } from '@/components/AvatarThumbnail';
import { getAuraColorStyle } from '@/lib/aura';
import { cn } from '@/lib/utils';
import type { AuraData, AvatarWearableData } from '@/types/api';

interface LeaderboardItemProps {
	index: number;
	userId: number;
	username: string;
	sex: string;
	skinTone: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
	value: number;
	valueLabel?: string;
	formatValue?: (v: number) => string;
}

function getRankClass(index: number): string {
	if (index === 0) return 'text-amber-500 font-bold';
	if (index === 1) return 'text-gray-400 font-bold dark:text-gray-300';
	if (index === 2) return 'text-amber-700 font-bold dark:text-amber-600';
	return 'text-gray-500 dark:text-slate-400';
}

export const LeaderboardItem = memo(function LeaderboardItem({
	index,
	username,
	sex,
	skinTone,
	wearables,
	aura,
	value,
	valueLabel,
	formatValue,
}: LeaderboardItemProps) {
	const colorStyle = index === 0 ? getAuraColorStyle(aura) : undefined;
	const displayValue = formatValue ? formatValue(value) : value.toLocaleString('da-DK');

	return (
		<div
			className={cn(
				'flex gap-2 items-center px-2 py-1.5 rounded-md transition-colors',
				'hover:bg-slate-50 dark:hover:bg-slate-700/50',
				index === 0 && 'aura-card-glow',
			)}
			style={colorStyle}
		>
			<span className={cn('w-6 text-sm text-right flex-shrink-0', getRankClass(index))}>
				{index + 1}.
			</span>
			<AvatarThumbnail
				sex={sex}
				skinTone={skinTone}
				wearables={wearables}
				aura={aura}
				size={24}
			/>
			<span
				className={cn(
					'flex-1 min-w-0 text-sm font-medium truncate',
					'text-slate-700 dark:text-slate-300',
				)}
			>
				{username}
			</span>
			<span className="text-sm text-slate-400 dark:text-slate-500 flex-shrink-0 tabular-nums">
				{displayValue}
				{valueLabel && <span className="ml-1">{valueLabel}</span>}
			</span>
		</div>
	);
});
