import { createFileRoute } from '@tanstack/react-router';

import { CatalogBrowser } from '@/components/CatalogBrowser';
import { Seo } from '@/components/Seo';

export const Route = createFileRoute('/katalog/')({
	component: KatalogIndex,
});

function KatalogIndex() {
	return (
		<div className="space-y-4">
			<Seo
				title="Katalog"
				description="Se alle ting og tøj i Skyskraber-kataloget med markedspriser og statistik."
			/>
			<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Katalog</h1>
			<CatalogBrowser />
		</div>
	);
}
