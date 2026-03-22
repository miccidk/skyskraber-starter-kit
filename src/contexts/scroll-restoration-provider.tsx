import { useEffect, useMemo, useState } from 'react';

import { ScrollContext } from '@/contexts/scroll-restoration-context';

export function ScrollRestorationProvider({ children }: { children: React.ReactNode }) {
	const [isPopState, setIsPopState] = useState(false);

	useEffect(() => {
		const onPopState = () => setIsPopState(true);
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, []);

	// Reset flag after one render cycle
	useEffect(() => {
		if (!isPopState) return;
		const id = setTimeout(() => setIsPopState(false), 0);
		return () => clearTimeout(id);
	}, [isPopState]);

	const contextValue = useMemo(() => ({ isPopState }), [isPopState]);

	return <ScrollContext.Provider value={contextValue}>{children}</ScrollContext.Provider>;
}
