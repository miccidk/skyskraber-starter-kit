const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://www.skyskraber.dk';
const CLIENT_ID = process.env.VITE_CLIENT_ID || '';
// CLIENT_SECRET intentionally does NOT have a VITE_ prefix — it must stay server-side only.
// Falls back to VITE_CLIENT_SECRET for backwards compatibility with existing .env files.
const CLIENT_SECRET = process.env.CLIENT_SECRET || process.env.VITE_CLIENT_SECRET || '';

const BASIC_AUTH = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;

export { API_BASE_URL, CLIENT_ID, CLIENT_SECRET };

export async function appFetch<T>(path: string): Promise<T> {
	const res = await fetch(`${API_BASE_URL}${path}`, {
		headers: { Authorization: BASIC_AUTH },
	});
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json() as Promise<T>;
}
