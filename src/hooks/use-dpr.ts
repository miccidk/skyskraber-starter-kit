import { useEffect, useState } from 'react';

function getOptimalDPR(): number {
	try {
		if (typeof window === 'undefined' || !window.devicePixelRatio) return 1;
		const dpr = window.devicePixelRatio;
		if (!isNaN(dpr) && isFinite(dpr) && dpr > 0) {
			// Cap at 3 for performance; lower on low-end devices
			const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
			if (isLowEnd && dpr > 2.5) return 2;
			if (isLowEnd && dpr > 2) return 2.5;
			return Math.min(dpr, 3);
		}
	} catch {
		// ignore
	}
	return 1;
}

export function useDpr(): number {
	const [dpr, setDpr] = useState(() => getOptimalDPR());

	useEffect(() => {
		const update = () => {
			const newDPR = getOptimalDPR();
			setDpr((prev) => (prev !== newDPR ? newDPR : prev));
		};

		window.addEventListener('resize', update);

		// matchMedia fires when devicePixelRatio changes (e.g. browser zoom)
		let mql: MediaQueryList | null = null;
		const listenDprChange = () => {
			mql?.removeEventListener('change', onDprChange);
			mql = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
			mql.addEventListener('change', onDprChange, { once: true });
		};
		const onDprChange = () => {
			update();
			listenDprChange();
		};
		listenDprChange();

		return () => {
			window.removeEventListener('resize', update);
			mql?.removeEventListener('change', onDprChange);
		};
	}, []);

	return dpr;
}
