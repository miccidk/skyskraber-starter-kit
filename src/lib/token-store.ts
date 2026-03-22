const KEYS = {
	accessToken: 'sky_access_token',
	refreshToken: 'sky_refresh_token',
	expiresAt: 'sky_expires_at',
	userId: 'sky_user_id',
} as const;

export function saveTokens(
	accessToken: string,
	refreshToken: string,
	expiresIn: number,
	userId: number,
): void {
	localStorage.setItem(KEYS.accessToken, accessToken);
	localStorage.setItem(KEYS.refreshToken, refreshToken);
	localStorage.setItem(KEYS.expiresAt, String(Date.now() + expiresIn * 1000));
	localStorage.setItem(KEYS.userId, String(userId));
}

export function getAccessToken(): string | null {
	const expiresAt = localStorage.getItem(KEYS.expiresAt);
	if (expiresAt && Date.now() > Number(expiresAt)) return null;
	return localStorage.getItem(KEYS.accessToken);
}

export function getRefreshToken(): string | null {
	return localStorage.getItem(KEYS.refreshToken);
}

export function getUserId(): number | null {
	const id = localStorage.getItem(KEYS.userId);
	return id ? Number(id) : null;
}

export function clearTokens(): void {
	for (const key of Object.values(KEYS)) {
		localStorage.removeItem(key);
	}
}
