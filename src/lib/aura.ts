import type { AuraData } from '@/types/api';

export function getAuraGlowClass(aura?: AuraData): string | undefined {
	if (!aura) return undefined;

	const intensity = aura.color
		? Math.round(aura.intensity ?? 1)
		: (aura.daily ? 1 : 0) +
			(aura.weekly ? 1 : 0) +
			(aura.monthly ? 1 : 0) +
			(aura.yearly ? 1 : 0) +
			(aura.allTime ? 1 : 0);

	if (intensity <= 0) return undefined;
	return `aura-glow-${Math.min(intensity, 5)}`;
}

export function getAuraColorStyle(aura?: AuraData): React.CSSProperties | undefined {
	if (!aura?.color) return undefined;
	const hex = aura.color;
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return { '--aura-color': `${r} ${g} ${b}` } as React.CSSProperties;
}
