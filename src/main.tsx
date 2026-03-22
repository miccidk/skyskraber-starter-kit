import '@/globals.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/components/theme-provider';
import { routeTree } from '@/routeTree.gen';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 2 * 60_000, // 2 minutes — data is fresh, no refetch
			gcTime: 10 * 60_000, // 10 minutes — keep in cache
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
				<RouterProvider router={router} />
			</ThemeProvider>
		</QueryClientProvider>
	</StrictMode>,
);
