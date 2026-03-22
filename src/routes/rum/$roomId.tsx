import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, ExternalLink, Lock, Users, Zap } from 'lucide-react';

import { InfoCard } from '@/components/InfoCard';
import { RoomCanvas } from '@/components/RoomCanvas';
import { Seo } from '@/components/Seo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchRoom } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { DAY_NAMES } from '@/lib/room-utils';

export const Route = createFileRoute('/rum/$roomId')({
	component: RumDetailPage,
	remountDeps: (opts) => [opts.params.roomId],
});

function RumDetailPage() {
	const { roomId: roomIdStr } = Route.useParams();
	const roomId = Number(roomIdStr);

	const { data: room, isLoading } = useQuery({
		queryKey: queryKeys.room(roomId),
		queryFn: () => fetchRoom(roomId),
	});

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (!room) {
		return (
			<div className="space-y-4">
				<Link to="/rum" className="inline-flex items-center gap-1 text-sm text-sky-500">
					<ArrowLeft className="h-4 w-4" />
					Tilbage til elevator
				</Link>
				<p className="text-slate-500 dark:text-slate-400">Kunne ikke finde dette rum.</p>
			</div>
		);
	}

	const hasImages = room.images && room.images.length > 0;
	const openingHours = room.openingHours ?? [];

	return (
		<div className="space-y-6">
			<Link
				to="/rum"
				className="inline-flex items-center gap-1 text-sm text-sky-500 hover:underline"
			>
				<ArrowLeft className="h-4 w-4" />
				Tilbage til elevator
			</Link>

			<Seo
				title={`${room.name} — Skyskraber Rum`}
				description={`${room.name} i Skyskraber${room.floorName ? ` · ${room.floorName}` : ''}. ${room.clients ?? 0} online nu.`}
			/>

			<div className="flex flex-col md:flex-row gap-6">
				{/* Room image */}
				{hasImages && (
					<Card className="flex-shrink-0">
						<CardContent className="p-4 flex justify-center">
							<RoomCanvas images={room.images} width={280} />
						</CardContent>
					</Card>
				)}

				{/* Room info */}
				<div className="flex-1 min-w-0 space-y-4">
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
								{room.name}
							</h1>
							<Badge variant="outline" className="text-xs">
								#{room.id}
							</Badge>
							{room.isSubscription && (
								<Zap className="h-4 w-4 animate-pulse fill-yellow-400 text-yellow-500" />
							)}
							{room.isClosed && (
								<Badge variant="default" className="gap-1">
									<Lock className="h-3 w-3" />
									Lukket
								</Badge>
							)}
						</div>
						{room.floorName && (
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
								{room.floorName}
							</p>
						)}
					</div>

					{room.description && (
						<p className="text-sm text-slate-700 dark:text-slate-300">
							{room.description}
						</p>
					)}

					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<InfoCard
							icon={<Users className="h-4 w-4 text-sky-500" />}
							label="Online nu"
							value={String(room.clients ?? 0)}
						/>
						{room.level != null && room.level > 0 && (
							<InfoCard label="Level-krav" value={String(room.level)} />
						)}
						{room.game && <InfoCard label="Spiltype" value={room.game} />}
					</div>

					{openingHours.length > 0 && (
						<Card>
							<CardContent className="p-4">
								<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
									<Clock className="h-4 w-4 text-slate-500" />
									Åbningstider
								</h3>
								<div className="space-y-1">
									{openingHours.map((h) => (
										<p
											key={`${h.day}-${h.openTime}`}
											className="text-xs text-slate-600 dark:text-slate-400"
										>
											<strong>{DAY_NAMES[h.day] ?? h.day}:</strong>{' '}
											{h.openTime.slice(0, 5)}–{h.closeTime.slice(0, 5)}
										</p>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{room.isClosed && room.closedReason && (
						<p className="text-sm text-red-500 dark:text-red-400">
							Lukket: {room.closedReason}
						</p>
					)}

					<a
						href="https://www.skyskraber.dk"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:underline"
					>
						Besøg dette rum på Skyskraber
						<ExternalLink className="h-3.5 w-3.5" />
					</a>
				</div>
			</div>
		</div>
	);
}

