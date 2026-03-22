import type { Context } from 'hono';
import { Hono } from 'hono';

import { API_BASE_URL, appFetch, CLIENT_ID, CLIENT_SECRET } from './token';

async function proxyAsset(c: Context): Promise<Response> {
	const res = await fetch(`${API_BASE_URL}${c.req.path}`);
	if (!res.ok) return c.json({ error: 'Not found' }, res.status as 404);
	const contentType = res.headers.get('content-type') || 'application/octet-stream';
	const body = await res.arrayBuffer();
	return new Response(body, {
		headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
	});
}

interface ApiEnvelope<T> {
	data: T;
	meta: { timestamp: string };
	pagination?: { page: number; limit: number; total: number };
}

const app = new Hono()
	.post('/api/oauth/token', async (c) => {
		const body: Record<string, unknown> = await c.req.json();

		// The backend injects client_id and client_secret server-side.
		// The frontend should never send or know the client_secret.
		const tokenBody: Record<string, unknown> = {
			...body,
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
		};

		const res = await fetch(`${API_BASE_URL}/api/oauth/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(tokenBody),
		});
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) return c.json(data, res.status as 400);

		// The token response doesn't include user_id, so we resolve it
		// via the /api/oauth/userinfo endpoint using the new access token
		const accessToken = typeof data.access_token === 'string' ? data.access_token : null;
		if (accessToken && !data.user_id) {
			try {
				const meRes = await fetch(`${API_BASE_URL}/api/oauth/userinfo`, {
					headers: { Authorization: `Bearer ${accessToken}` },
				});
				if (meRes.ok) {
					const meData = (await meRes.json()) as { data?: { id?: number } };
					if (meData.data?.id) data.user_id = meData.data.id;
				}
			} catch {
				// If we can't resolve user_id, continue without it
			}
		}

		return c.json(data);
	})
	.get('/avatars/*', proxyAsset)
	.get('/items/*', proxyAsset)
	.get('/api/files/:fileId', proxyAsset)
	.get('/api/statistics/online-count', async (c) => {
		const res = await appFetch<ApiEnvelope<{ count: number }>>(
			'/api/v1/statistics/online-count',
		);
		return c.json(res);
	})
	.get('/api/statistics/catalog', async (c) => {
		const res = await appFetch<ApiEnvelope<unknown>>('/api/v1/statistics/catalog');
		return c.json(res);
	})
	.get('/api/statistics/main-overview', async (c) => {
		try {
			const res = await appFetch<unknown>('/api/v1/statistics');
			return c.json(res);
		} catch {
			try {
				const res = await appFetch<unknown>('/api/v1/statistics/');
				return c.json(res);
			} catch (e) {
				console.error('Statistics endpoint error:', e);
				return c.json({ error: 'Failed to fetch statistics' }, 502);
			}
		}
	})
	.get('/api/statistics/:type', async (c) => {
		const type = c.req.param('type');
		const query = new URL(c.req.url).search;
		const res = await appFetch<ApiEnvelope<unknown>>(`/api/v1/statistics/${type}${query}`);
		return c.json(res);
	})
	.get('/api/marketplace/price', async (c) => {
		const query = new URL(c.req.url).search;
		const res = await appFetch<ApiEnvelope<unknown>>(`/api/v1/marketplace/price${query}`);
		return c.json(res);
	})
	.get('/api/marketplace/sales-history', async (c) => {
		const query = new URL(c.req.url).search;
		const res = await appFetch<ApiEnvelope<unknown>>(
			`/api/v1/marketplace/sales-history${query}`,
		);
		return c.json(res);
	})
	.get('/api/rooms', async (c) => {
		const query = new URL(c.req.url).search;
		const res = await appFetch<ApiEnvelope<unknown>>(`/api/v1/rooms${query}`);
		return c.json(res);
	})
	.get('/api/rooms/:id', async (c) => {
		const id = c.req.param('id');
		const res = await appFetch<ApiEnvelope<unknown>>(`/api/v1/rooms/${id}`);
		return c.json(res);
	});

export type AppType = typeof app;
export default app;
