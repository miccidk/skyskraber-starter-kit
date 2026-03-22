import { createRootRoute, Link, Outlet, useRouter } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useScrollRestoration } from '@/contexts/scroll-restoration-context';
import { ScrollRestorationProvider } from '@/contexts/scroll-restoration-provider';
import { useAuth } from '@/hooks/use-auth';

export const Route = createRootRoute({
	component: RootLayout,
});

const navLinks = [
	{ to: '/', label: 'Hjem' },
	{ to: '/statistik', label: 'Statistik' },
	{ to: '/katalog', label: 'Katalog' },
	{ to: '/rum', label: 'Rum' },
	{ to: '/profil', label: 'Min Profil' },
] as const;

function RootLayout() {
	return (
		<ScrollRestorationProvider>
			<RootLayoutInner />
		</ScrollRestorationProvider>
	);
}

function RootLayoutInner() {
	const { isAuthenticated, login, logout } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const mainRef = useRef<HTMLElement>(null);
	const { isPopState } = useScrollRestoration();
	const router = useRouter();
	const currentPathname = router.state.location.pathname;
	const currentSearch = router.state.location.searchStr;
	const previousPathnameRef = useRef(currentPathname);
	const isHandlingPopStateRef = useRef(false);

	// Disable browser scroll restoration
	useEffect(() => {
		if ('scrollRestoration' in history) {
			history.scrollRestoration = 'manual';
		}
	}, []);

	// Save scroll position on scroll
	useEffect(() => {
		const target = mainRef.current;
		if (!target) return;

		let scheduled = false;
		const onScroll = () => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(() => {
				scheduled = false;
				try {
					const key = currentPathname + currentSearch;
					sessionStorage.setItem(`scroll:${key}`, String(target.scrollTop));
				} catch {
					// ignore
				}
			});
		};

		target.addEventListener('scroll', onScroll, { passive: true });
		return () => target.removeEventListener('scroll', onScroll);
	}, [currentPathname, currentSearch]);

	// Restore scroll on popstate
	useEffect(() => {
		if (!isPopState) return;
		isHandlingPopStateRef.current = true;
		const target = mainRef.current;
		if (!target) return;

		const key = currentPathname + currentSearch;
		const val = sessionStorage.getItem(`scroll:${key}`);
		const pos = val ? parseInt(val, 10) : 0;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				target.scrollTop = pos;
				isHandlingPopStateRef.current = false;
			});
		});
	}, [isPopState, currentPathname, currentSearch]);

	// Scroll to top on normal navigation (not popstate)
	useLayoutEffect(() => {
		const pathnameChanged = previousPathnameRef.current !== currentPathname;
		if (pathnameChanged && !isHandlingPopStateRef.current) {
			const target = mainRef.current;
			if (target) {
				target.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
				setTimeout(() => {
					target.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
				}, 0);
			}
		}
		previousPathnameRef.current = currentPathname;
	}, [currentPathname]);

	return (
		<div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden">
			{/* Nav */}
			<header className="flex-shrink-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
				<div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
					<Link
						to="/"
						className="text-lg font-extrabold text-sky-blue no-underline tracking-tight"
					>
						Skyskraber
					</Link>

					<nav className="hidden items-center gap-0.5 md:flex">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								activeOptions={{ exact: link.to === '/' }}
								className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 [&.active]:bg-sky-50 [&.active]:text-sky-700 dark:[&.active]:bg-sky-950/50 dark:[&.active]:text-sky-400"
							>
								{link.label}
							</Link>
						))}
					</nav>

					<div className="flex items-center gap-2">
						<ThemeToggle />
						{isAuthenticated ? (
							<Button variant="outline" size="sm" onClick={logout}>
								Log ud
							</Button>
						) : (
							<Button variant="primary" size="sm" onClick={login}>
								Log ind
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden"
							onClick={() => setMenuOpen(!menuOpen)}
							aria-label="Menu"
						>
							{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
						</Button>
					</div>
				</div>

				{menuOpen && (
					<nav className="border-t border-slate-200/80 px-4 py-2 dark:border-slate-800/80 md:hidden">
						{navLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								activeOptions={{ exact: link.to === '/' }}
								className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 [&.active]:bg-sky-50 [&.active]:text-sky-700 dark:[&.active]:bg-sky-950/50 dark:[&.active]:text-sky-400"
								onClick={() => setMenuOpen(false)}
							>
								{link.label}
							</Link>
						))}
					</nav>
				)}
			</header>

			{/* Scrollable content — single page scrollbar for everything */}
			<main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col">
				<div className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">
					<Outlet />
				</div>
				<Footer />
			</main>
		</div>
	);
}
