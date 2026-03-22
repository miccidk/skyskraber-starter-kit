import { useEffect, useState } from 'react';

/**
 * Returns true if dark mode is active. Re-renders when the theme changes
 * (observes class mutations on <html>).
 */
export function useIsDark(): boolean {
	const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

	useEffect(() => {
		const el = document.documentElement;
		const observer = new MutationObserver(() => {
			setIsDark(el.classList.contains('dark'));
		});
		observer.observe(el, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	}, []);

	return isDark;
}
