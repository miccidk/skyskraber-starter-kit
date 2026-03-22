import { createFileRoute } from '@tanstack/react-router';

import { RoomBrowser } from '@/components/RoomBrowser';
import { Seo } from '@/components/Seo';

export const Route = createFileRoute('/rum/')({
	component: RumIndex,
});

function RumIndex() {
	return (
		<div className="space-y-4">
			<Seo
				title="Rum — Skyskraber Elevator"
				description="Udforsk offentlige rum i Skyskraber-elevatorens etager med online-tæller."
			/>
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Elevator</h1>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					Offentlige rum med etage
				</p>
			</div>
			<RoomBrowser />
		</div>
	);
}
