/**
 * Shared image loader with persistent LRU cache.
 * Matches skyskraber's ImageLoader pattern:
 * - Single global instance shared across all canvas components
 * - image.decode() for off-main-thread decoding (avoids jank on first drawImage)
 * - LRU eviction to bound memory
 * - Synchronous cache lookup via tryGet() for immediate rendering
 */

const MAX_CACHE_SIZE = 400;

class ImageLoader {
	private _cache = new Map<string, HTMLImageElement>();
	private _pending = new Map<string, Promise<HTMLImageElement>>();
	private _order: string[] = [];

	/** Synchronous lookup — returns cached image or null */
	tryGet(url: string): HTMLImageElement | null {
		const cached = this._cache.get(url);
		if (cached) {
			this._touch(url);
			return cached;
		}
		return null;
	}

	/** Load an image (returns cached if available) */
	get(url: string): Promise<HTMLImageElement> {
		if (!url) return Promise.reject(new Error('No URL'));

		const cached = this._cache.get(url);
		if (cached) {
			this._touch(url);
			return Promise.resolve(cached);
		}

		const pending = this._pending.get(url);
		if (pending) return pending;

		const promise = this._load(url);
		this._pending.set(url, promise);

		promise
			.then((img) => {
				this._pending.delete(url);
				this._put(url, img);
			})
			.catch(() => {
				this._pending.delete(url);
			});

		return promise;
	}

	private async _load(url: string): Promise<HTMLImageElement> {
		const img = new Image();
		img.crossOrigin = 'anonymous';

		return new Promise<HTMLImageElement>((resolve, reject) => {
			img.onload = () => {
				// Decode off main thread to avoid synchronous decode jank on first drawImage
				if (img.decode) {
					img.decode()
						.then(() => resolve(img))
						.catch(() => resolve(img)); // Fallback: still usable even if decode fails
				} else {
					resolve(img);
				}
			};
			img.onerror = () => reject(new Error(`Failed to load: ${url}`));
			img.src = url;
		});
	}

	private _touch(url: string): void {
		const idx = this._order.indexOf(url);
		if (idx > -1) this._order.splice(idx, 1);
		this._order.push(url);
	}

	private _put(url: string, img: HTMLImageElement): void {
		if (this._cache.has(url)) {
			this._touch(url);
			return;
		}

		// Evict oldest entries if over capacity
		while (this._order.length >= MAX_CACHE_SIZE) {
			const oldest = this._order.shift();
			if (oldest) this._cache.delete(oldest);
		}

		this._cache.set(url, img);
		this._order.push(url);
	}
}

/** Singleton loader shared across all components and page navigations */
export const imageLoader = new ImageLoader();
