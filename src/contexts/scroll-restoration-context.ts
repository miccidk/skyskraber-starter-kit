import { createContext, useContext } from 'react';

interface ScrollContextType {
	isPopState: boolean;
}

export const ScrollContext = createContext<ScrollContextType>({
	isPopState: false,
});

export const useScrollRestoration = () => useContext(ScrollContext);
