import { useCallback, useSyncExternalStore } from 'react';

import { startLogin } from '@/lib/oauth';
import { clearTokens, getAccessToken, getRefreshToken, getUserId } from '@/lib/token-store';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
	listeners.add(callback);
	return () => listeners.delete(callback);
}

/** Call after saving or clearing tokens to notify all useAuth consumers */
export function notifyAuthChange() {
	for (const listener of listeners) listener();
}

function getSnapshot() {
	const userId = getUserId();
	if (userId === null) return null;
	// Consider authenticated if we have either a valid access token or a refresh token
	const hasToken = getAccessToken() !== null || getRefreshToken() !== null;
	if (!hasToken) return null;
	return userId;
}

export function useAuth() {
	const userId = useSyncExternalStore(subscribe, getSnapshot);
	const isAuthenticated = userId !== null;

	const login = useCallback(() => {
		void startLogin();
	}, []);

	const logout = useCallback(() => {
		clearTokens();
		notifyAuthChange();
	}, []);

	return { isAuthenticated, userId, login, logout };
}
