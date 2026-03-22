/**
 * Resolves an image URL or file UUID to a fetchable URL.
 * Matches skyskraber's getFileUrl() pattern:
 * - Full URLs (http/https/blob) → returned as-is
 * - Absolute paths (/api/files/..., /avatars/...) → returned as-is
 * - UUIDs → prepended with /api/files/
 */
export function resolveImageUrl(urlOrId: string | undefined | null): string {
	if (!urlOrId) return '';
	if (urlOrId.startsWith('/') || urlOrId.startsWith('http') || urlOrId.startsWith('blob:')) {
		return urlOrId;
	}
	return `/api/files/${urlOrId}`;
}

/**
 * Gets a resolved image URL from an object that may have either `imageUrl` or `image` field.
 * The API uses `imageUrl` for catalog/profile images (full path) and `image` for leaderboard wearables (UUID).
 */
export function getImageUrl(img: { imageUrl?: string; image?: string }): string {
	return resolveImageUrl(img.imageUrl || img.image);
}
