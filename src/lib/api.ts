import { hc } from 'hono/client';

import { notifyAuthChange } from '@/hooks/use-auth';
import { API_BASE_URL } from '@/lib/constants';
import { refreshAccessToken } from '@/lib/oauth';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/lib/token-store';
import type {
	ApiEnvelope,
	CatalogChartPoint,
	CatalogData,
	GameLeaderboardEntry,
	MainStatisticsData,
	MarketPriceData,
	RoomData,
	SaleRecord,
	TokenResponse,
	UserProfile,
} from '@/types/api';

// eslint-disable-next-line no-restricted-imports -- server types must be imported from outside src
import type { AppType } from '../../server/app';

// ── Hono RPC client (public data via backend) ──────────────

const client = hc<AppType>('/');

// ── Public endpoints (via Hono backend) ────────────────────

export async function fetchOnlineCount(): Promise<number> {
	const res = await client.api.statistics['online-count'].$get();
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as unknown as ApiEnvelope<{ count: number }>;
	return json.data.count;
}

export async function fetchCatalog(): Promise<CatalogData> {
	const res = await client.api.statistics.catalog.$get();
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as unknown as ApiEnvelope<CatalogData>;
	return json.data;
}

export async function fetchStatistic<T = unknown>(
	type: string,
	params?: Record<string, string>,
): Promise<T> {
	const query = params ? `?${new URLSearchParams(params)}` : '';
	const res = await fetch(`/api/statistics/${type}${query}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<T>;
	return json.data;
}

export async function fetchMainStatistics(): Promise<MainStatisticsData> {
	const res = await fetch('/api/statistics/main-overview');
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as Record<string, unknown>;
	// Handle both ApiEnvelope-wrapped and direct response
	const data = json.data ?? json;
	if (
		typeof data === 'object' &&
		data !== null &&
		'topOnline' in (data as Record<string, unknown>)
	) {
		return data as MainStatisticsData;
	}
	// Maybe nested one level deeper
	const inner = (data as Record<string, unknown>)?.data;
	if (
		typeof inner === 'object' &&
		inner !== null &&
		'topOnline' in (inner as Record<string, unknown>)
	) {
		return inner as MainStatisticsData;
	}
	console.warn('[fetchMainStatistics] Unexpected response shape:', Object.keys(data as object));
	return data as MainStatisticsData;
}

export async function fetchGameLeaderboard(
	gameType: 'ludo' | 'poker',
	betMode?: 'free' | 'betting',
	limit = 10,
): Promise<GameLeaderboardEntry[]> {
	const params: Record<string, string> = { gameType, limit: String(limit) };
	if (betMode) params.betMode = betMode;
	return fetchStatistic<GameLeaderboardEntry[]>('leaderboard', params);
}

export async function fetchMarketPrice(
	itemType: 'item' | 'wearable',
	typeId: number,
): Promise<MarketPriceData> {
	const res = await fetch(`/api/marketplace/price?itemType=${itemType}&typeId=${typeId}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<MarketPriceData>;
	return json.data;
}

export async function fetchSalesHistory(
	itemType: 'item' | 'wearable',
	typeId: number,
	page = 1,
): Promise<{ data: SaleRecord[]; pagination: { page: number; limit: number; total: number } }> {
	const res = await fetch(
		`/api/marketplace/sales-history?itemType=${itemType}&typeId=${typeId}&page=${page}`,
	);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<SaleRecord[]>;
	return { data: json.data, pagination: json.pagination ?? { page, limit: 20, total: 0 } };
}

export async function fetchCatalogCountChart(
	kind: 'item' | 'wearable',
	typeId: number,
	limit = 90,
): Promise<CatalogChartPoint[]> {
	const params = new URLSearchParams({ kind, typeId: String(typeId), limit: String(limit) });
	const res = await fetch(`/api/statistics/catalog-chart?${params}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<CatalogChartPoint[]>;
	return json.data;
}

export async function fetchRooms(
	page = 1,
	limit = 20,
	search?: string,
): Promise<{ data: RoomData[]; pagination: { page: number; limit: number; total: number } }> {
	const params = new URLSearchParams({ page: String(page), limit: String(limit) });
	if (search) params.set('search', search);
	const res = await fetch(`/api/rooms?${params}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<RoomData[]>;
	return { data: json.data, pagination: json.pagination ?? { page, limit, total: 0 } };
}

export async function fetchRoom(id: number): Promise<RoomData> {
	const res = await fetch(`/api/rooms/${id}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	const json = (await res.json()) as ApiEnvelope<RoomData>;
	return json.data;
}

// ── User-authenticated endpoints (direct to Skyskraber) ───

// Singleton refresh promise prevents concurrent 401s from triggering duplicate refreshes
let refreshPromise: Promise<TokenResponse> | null = null;

async function doRefresh(refreshToken: string) {
	if (!refreshPromise) {
		refreshPromise = refreshAccessToken(refreshToken).finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

async function apiFetch<T>(path: string): Promise<T> {
	let token = getAccessToken();

	if (!token) {
		const refresh = getRefreshToken();
		if (refresh) {
			try {
				const result = await doRefresh(refresh);
				saveTokens(
					result.access_token,
					result.refresh_token,
					result.expires_in,
					result.user_id,
				);
				notifyAuthChange();
				token = result.access_token;
			} catch {
				clearTokens();
				notifyAuthChange();
				throw new Error('Session expired');
			}
		} else {
			throw new Error('Not authenticated');
		}
	}

	const res = await fetch(`${API_BASE_URL}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (res.status === 401) {
		const refresh = getRefreshToken();
		if (!refresh) {
			clearTokens();
			notifyAuthChange();
			throw new Error('Session expired');
		}
		try {
			const result = await doRefresh(refresh);
			saveTokens(result.access_token, result.refresh_token, result.expires_in, result.user_id);
			notifyAuthChange();

			const retry = await fetch(`${API_BASE_URL}${path}`, {
				headers: { Authorization: `Bearer ${result.access_token}` },
			});
			if (!retry.ok) throw new Error(`API error: ${retry.status}`);
			return retry.json() as Promise<T>;
		} catch {
			clearTokens();
			notifyAuthChange();
			throw new Error('Session expired');
		}
	}

	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json() as Promise<T>;
}

export async function fetchUserProfile(userId: number): Promise<UserProfile> {
	const res = await apiFetch<ApiEnvelope<UserProfile>>(`/api/v1/users/${userId}`);
	return res.data;
}
