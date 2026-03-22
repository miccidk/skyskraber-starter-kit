export interface WearableImageData {
	imageUrl?: string;
	image?: string;
	layerType: 'background' | 'foreground';
	frames: number;
	frameDuration: number;
	scale: string;
	offsetX: number;
	offsetY: number;
	femaleOffsetX: number | null;
	femaleOffsetY: number | null;
	sortOrder: number;
	needsSkinTone: boolean;
}

export interface AvatarWearableData {
	name: string;
	type: string;
	order: number;
	images: WearableImageData[];
}

export interface AuraData {
	daily: boolean;
	weekly: boolean;
	monthly: boolean;
	yearly: boolean;
	allTime: boolean;
	color?: string;
	intensity?: number;
}

export interface AvatarData {
	sex: string;
	skinTone: string | number;
	avatarImage: string;
	wearables: AvatarWearableData[];
}

export interface UserProfile {
	id: number;
	username: string;
	sex: string;
	skinTone: string;
	onlineTime: { hours: number; minutes: number };
	activityPoints: number;
	createdAt: string;
	profileText: string | null;
	lastSeen: string;
	level: number;
	isOnline: boolean;
	isMentor: boolean;
	isSubscribed: boolean;
	avatarImage: string;
	profileImageUrl: string | null;
	profileImageThumbUrl: string | null;
	feedPostCount: number;
	feedCommentCount: number;
	aura: AuraData;
	wearables: AvatarWearableData[];
	name?: string | null;
	birthdate?: string | null;
}

export interface MarketPriceData {
	avg_price: number | null;
}

export interface ApiEnvelope<T> {
	data: T;
	meta: { timestamp: string };
	pagination?: { page: number; limit: number; total: number };
}

export interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	user_id: number;
}

// Catalog types
export interface AssetImage {
	imageUrl: string;
	layerType: 'background' | 'foreground';
	frames: number;
	frameDuration: number;
	scale: string;
	offsetX: number;
	offsetY: number;
	sortOrder: number;
	needsSkinTone?: boolean;
}

export interface CatalogItemType {
	id: number;
	name: string;
	type: string;
	level: number;
	categoryId: number | null;
	categoryName: string | null;
	totalCount: number;
	resellPrice: number;
	isTradable: boolean | null;
	images: AssetImage[];
}

export interface CatalogWearableType {
	id: number;
	name: string;
	type: string;
	sex: string | null;
	level: number;
	categoryId: number | null;
	categoryName: string | null;
	totalCount: number;
	resellPrice: number;
	isTradable: boolean | null;
	images: AssetImage[];
}

export interface CatalogCategory {
	id: number;
	name: string;
}

export interface CatalogData {
	items: CatalogItemType[];
	wearables: CatalogWearableType[];
	itemCategories: CatalogCategory[];
	wearableCategories: CatalogCategory[];
}

export interface CatalogEntry {
	kind: 'item' | 'wearable';
	id: number;
	name: string;
	type: string;
	level: number;
	categoryName: string | null;
	categoryId: number | null;
	images: AssetImage[];
	totalCount: number;
	sex?: string | null;
	resellPrice?: number;
	isTradable?: boolean | null;
}

export interface RoomData {
	id: number;
	name: string;
	description: string | null;
	level: number | null;
	game: string | null;
	images: AssetImage[];
	floorName: string | null;
	floorDisplayOrder: number | null;
	clients?: number;
	isSubscription?: boolean;
	isClosed?: boolean;
	closedReason?: string;
	openingHours?: { day: number; openTime: string; closeTime: string }[];
}

export interface SaleRecord {
	id: number;
	salePrice: number;
	quantity: number;
	soldAt: string;
	buyerUsername: string | null;
	sellerUsername: string | null;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: { page: number; limit: number; total: number };
}

export interface StatisticsTotals {
	date: string;
	totalUsers: number;
	totalCoins: number;
	totalItems: number;
	totalUserWearables: number;
	totalMessages: number;
}

export interface LeaderboardEntry {
	userId: number;
	username: string;
	sex: string;
	skinTone: number;
	count?: number;
	points?: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
	date?: string;
}

export interface OnlineTimePoint {
	period: string;
	hours: number;
}

export interface GameLeaderboardEntry {
	userId: number;
	username: string;
	sex: string;
	skinTone: number;
	wins: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
}

export interface CatalogChartPoint {
	date: string;
	totalCount: number;
}

export interface TopOnlineEntry {
	id: number;
	username: string;
	onlineTime: { hours: number; minutes: number };
	sex: string;
	skinTone: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
}

export interface TopJailEntry {
	id: number;
	username: string;
	jailTime: { hours: number; minutes: number };
	sex: string;
	skinTone: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
}

export interface ActivityLeaderboardEntry {
	userId: number;
	username: string;
	sex: string;
	skinTone: number;
	points: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
	date?: string;
}

export interface ActivityPointsData {
	allTime: { leaderboard: ActivityLeaderboardEntry[] };
	daily: { leaderboard: ActivityLeaderboardEntry[] };
	weekly: { leaderboard: ActivityLeaderboardEntry[] };
	monthly: { leaderboard: ActivityLeaderboardEntry[] };
	yearly: { leaderboard: ActivityLeaderboardEntry[] };
	user?: {
		totalPoints: number;
		dailyPoints: number;
		weeklyPoints: number;
		monthlyPoints: number;
		yearlyPoints: number;
		allTimeRank: number | null;
		dailyRank: number | null;
		weeklyRank: number | null;
		monthlyRank: number | null;
		yearlyRank: number | null;
	};
}

export interface MainStatisticsData {
	topOnline: TopOnlineEntry[];
	topJail: TopJailEntry[];
	totalUsers: number;
	totalCoins: number;
	totalItems: number;
	totalUserWearables: number;
	totalMessages: number;
	activityPoints?: ActivityPointsData;
}
