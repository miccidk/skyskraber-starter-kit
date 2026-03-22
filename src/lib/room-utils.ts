export const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

export function formatOpeningHours(
	hours: { day: number; openTime: string; closeTime: string }[],
): string[] {
	if (!hours || hours.length === 0) return [];
	return hours.map(
		(h) => `${DAY_NAMES[h.day] ?? h.day}: ${h.openTime.slice(0, 5)}–${h.closeTime.slice(0, 5)}`,
	);
}
