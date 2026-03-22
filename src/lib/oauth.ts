import { API_BASE_URL, CLIENT_ID, REDIRECT_URI, SCOPES } from '@/lib/constants';
import type { TokenResponse } from '@/types/api';

/**
 * Generate a random code verifier for PKCE (43-128 chars).
 */
export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64UrlEncode(array);
}

/**
 * Generate the S256 code challenge from a verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build the full authorization URL and redirect the user.
 */
export async function startLogin(): Promise<void> {
	const verifier = generateCodeVerifier();
	const challenge = await generateCodeChallenge(verifier);
	const state = crypto.randomUUID();

	// Store for callback
	sessionStorage.setItem('pkce_verifier', verifier);
	sessionStorage.setItem('oauth_state', state);

	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		scope: SCOPES,
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
	});

	window.location.href = `${API_BASE_URL}/api/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for tokens via backend proxy.
 * The backend injects client_id/client_secret server-side — the frontend never handles secrets.
 */
export async function exchangeCode(code: string): Promise<TokenResponse> {
	const verifier = sessionStorage.getItem('pkce_verifier');
	if (!verifier) throw new Error('Missing PKCE verifier');

	const res = await fetch('/api/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'authorization_code',
			code,
			redirect_uri: REDIRECT_URI,
			code_verifier: verifier,
		}),
	});

	if (!res.ok) {
		const errObj = (await res.json().catch(() => ({}))) as {
			error?: string;
			error_description?: string;
		};
		const message =
			errObj.error_description || errObj.error || `Token exchange failed: ${res.status}`;
		console.error('OAuth token exchange error:', { status: res.status, ...errObj });
		throw new Error(message);
	}

	sessionStorage.removeItem('pkce_verifier');
	sessionStorage.removeItem('oauth_state');

	return res.json() as Promise<TokenResponse>;
}

/**
 * Refresh an expired access token via backend proxy.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
	const res = await fetch('/api/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	});

	if (!res.ok) throw new Error('Token refresh failed');
	return res.json() as Promise<TokenResponse>;
}
