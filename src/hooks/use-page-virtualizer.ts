import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface UsePageVirtualizerOptions {
	count: number;
	estimateSize: (index: number) => number;
	overscan?: number;
	gap?: number;
}

/**
 * Virtualizer that uses the page-level `<main>` scroll container.
 * Calculates scrollMargin dynamically so the list can be positioned
 * anywhere in the page flow (below headers, filters, etc.).
 *
 * Matches the pattern from miccidk/skyskraber.
 */
export function usePageVirtualizer({
	count,
	estimateSize,
	overscan = 10,
	gap,
}: UsePageVirtualizerOptions) {
	const containerElRef = useRef<HTMLDivElement | null>(null);
	const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
	const [scrollMargin, setScrollMargin] = useState(0);

	const containerRef = useCallback((el: HTMLDivElement | null) => {
		containerElRef.current = el;
		setContainerEl(el);
	}, []);

	useLayoutEffect(() => {
		const scrollEl = document.querySelector('main');
		const el = containerElRef.current;
		if (!scrollEl || !el) return;

		const measure = () => {
			const scrollRect = scrollEl.getBoundingClientRect();
			const containerRect = el.getBoundingClientRect();
			setScrollMargin(containerRect.top - scrollRect.top + scrollEl.scrollTop);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(scrollEl);
		observer.observe(el);
		return () => observer.disconnect();
	}, [containerEl]);

	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual API is intentionally non-memoizable
	const virtualizer = useVirtualizer({
		count,
		estimateSize,
		getScrollElement: () => document.querySelector('main'),
		scrollMargin,
		overscan,
		gap,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();

	const firstItem = virtualItems[0];
	const lastItem = virtualItems[virtualItems.length - 1];
	const paddingTop = firstItem ? firstItem.start - scrollMargin : 0;
	const paddingBottom = lastItem ? totalSize - (lastItem.end - scrollMargin) : 0;

	return {
		virtualizer,
		virtualItems,
		totalSize,
		containerRef,
		scrollMargin,
		paddingTop,
		paddingBottom,
	};
}
