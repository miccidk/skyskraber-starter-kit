export const queryKeys = {
	user: (id: number) => ['user', id] as const,
	onlineCount: () => ['online-count'] as const,
	marketPrice: (itemType: string, typeId: number) => ['market-price', itemType, typeId] as const,
	salesHistory: (itemType: string, typeId: number, page: number) =>
		['sales-history', itemType, typeId, page] as const,
	catalog: () => ['catalog'] as const,
	catalogCountChart: (kind: string, typeId: number, limit: number) =>
		['catalog-count-chart', kind, typeId, limit] as const,
	rooms: (page: number, search?: string) => ['rooms', page, search] as const,
	room: (id: number) => ['room', id] as const,
	statistic: (type: string) => ['statistic', type] as const,
	mainStatistics: () => ['main-statistics'] as const,
	gameLeaderboard: (gameType: string, betMode?: string, limit?: string) =>
		['game-leaderboard', gameType, betMode, limit] as const,
};
