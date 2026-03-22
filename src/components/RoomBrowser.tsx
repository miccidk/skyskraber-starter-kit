import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Clock, Lock, Search, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { RoomCanvas } from '@/components/RoomCanvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageVirtualizer } from '@/hooks/use-page-virtualizer';
import { fetchRooms } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatOpeningHours } from '@/lib/room-utils';
import { cn } from '@/lib/utils';
import type { RoomData } from '@/types/api';

interface FloorGroup {
	floorName: string;
	floorDisplayOrder: number;
	rooms: RoomData[];
}

type VirtualRow =
	| { kind: 'floor'; floorName: string }
	| { kind: 'room'; room: RoomData; isFirstInFloor: boolean };

function buildVirtualRows(floors: FloorGroup[]): VirtualRow[] {
	const rows: VirtualRow[] = [];
	for (const floor of floors) {
		rows.push({ kind: 'floor', floorName: floor.floorName });
		for (let i = 0; i < floor.rooms.length; i++) {
			rows.push({ kind: 'room', room: floor.rooms[i]!, isFirstInFloor: i === 0 });
		}
	}
	return rows;
}

function groupByFloor(rooms: RoomData[]): FloorGroup[] {
	const map = new Map<string, FloorGroup>();
	for (const room of rooms) {
		const key = room.floorName ?? 'Ukendt';
		const existing = map.get(key);
		if (existing) {
			existing.rooms.push(room);
		} else {
			map.set(key, {
				floorName: key,
				floorDisplayOrder: room.floorDisplayOrder ?? 999,
				rooms: [room],
			});
		}
	}
	return [...map.values()].sort((a, b) => a.floorDisplayOrder - b.floorDisplayOrder);
}


export function RoomBrowser() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const { data, isLoading } = useQuery({
		queryKey: queryKeys.rooms(page, debouncedSearch),
		queryFn: () => fetchRooms(page, 50, debouncedSearch || undefined),
	});

	// Clean up debounce timeout on unmount
	useEffect(() => {
		return () => clearTimeout(debounceRef.current);
	}, []);

	function handleSearch(value: string) {
		setSearch(value);
		clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(value);
			setPage(1);
		}, 300);
	}

	const rooms = useMemo(() => data?.data ?? [], [data?.data]);
	const pagination = data?.pagination ?? { page: 1, limit: 50, total: 0 };
	const totalPages = Math.ceil(pagination.total / pagination.limit);

	const floors = useMemo(() => groupByFloor(rooms), [rooms]);
	const virtualRows = useMemo(() => buildVirtualRows(floors), [floors]);

	const estimateSize = useCallback(
		(index: number) => {
			const row = virtualRows[index];
			if (!row) return 48;
			return row.kind === 'floor' ? 32 : 48;
		},
		[virtualRows],
	);

	const { virtualizer, virtualItems, containerRef, paddingTop, paddingBottom } =
		usePageVirtualizer({
			count: virtualRows.length,
			estimateSize,
			overscan: 15,
		});

	return (
		<div className="space-y-3">
			<div className="relative">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
				<Input
					placeholder="Søg rum..."
					value={search}
					onChange={(e) => handleSearch(e.target.value)}
					className="pl-9"
					aria-label="Søg i rum"
				/>
			</div>

			<div
				ref={containerRef}
				className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
			>
				{isLoading && !data ? (
					<div className="divide-y divide-slate-200 dark:divide-slate-700">
						{Array.from({ length: 8 }, (_, i) => (
							<div key={i} className="p-2 flex items-center gap-3">
								<Skeleton className="h-[34px] w-[40px] rounded flex-shrink-0" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
								<Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
							</div>
						))}
					</div>
				) : rooms.length === 0 ? (
					<div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
						Ingen rum fundet.
					</div>
				) : (
					<div
						style={{
							paddingTop: paddingTop > 0 ? paddingTop : 0,
							paddingBottom: paddingBottom > 0 ? paddingBottom : 0,
						}}
					>
						{virtualItems.map((vi) => {
							const row = virtualRows[vi.index]!;

							if (row.kind === 'floor') {
								return (
									<div
										key={vi.key}
										data-index={vi.index}
										ref={virtualizer.measureElement}
									>
										<FloorHeader name={row.floorName} />
									</div>
								);
							}

							return (
								<div
									key={vi.key}
									data-index={vi.index}
									ref={virtualizer.measureElement}
								>
									<RoomRow room={row.room} isFirstInFloor={row.isFirstInFloor} />
								</div>
							);
						})}
					</div>
				)}
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<span className="text-xs text-slate-500 dark:text-slate-400">
						Side {page} af {totalPages}
					</span>
					<div className="flex gap-1">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
							aria-label="Forrige side"
						>
							<ChevronLeft className="h-3 w-3" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= totalPages}
							aria-label="Næste side"
						>
							<ChevronRight className="h-3 w-3" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function FloorHeader({ name }: { name: string }) {
	return (
		<div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
			{name}
		</div>
	);
}

function RoomRow({ room, isFirstInFloor }: { room: RoomData; isFirstInFloor: boolean }) {
	const hasImages = room.images && room.images.length > 0;
	const openingHoursFormatted = formatOpeningHours(room.openingHours ?? []);
	const isClosed = room.isClosed;

	return (
		<Link
			to="/rum/$roomId"
			params={{ roomId: String(room.id) }}
			className={cn(
				'flex gap-2 items-center p-2 transition-colors text-sm no-underline',
				'hover:bg-slate-50 dark:hover:bg-slate-700/50',
				'dark:text-slate-100',
				!isFirstInFloor && 'border-t border-slate-100 dark:border-slate-700/50',
				isClosed && 'opacity-75',
			)}
		>
			{hasImages ? (
				<RoomCanvas images={room.images} width={40} />
			) : (
				<div
					className="flex flex-shrink-0 items-center justify-center rounded bg-sky-100 text-sm font-bold text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
					style={{ width: 40, height: 34 }}
				>
					{room.name.charAt(0).toUpperCase()}
				</div>
			)}

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
						{room.name}
					</span>
					<Badge variant="outline" className="text-[10px] flex-shrink-0">
						#{room.id}
					</Badge>
					{room.isSubscription && (
						<Zap
							className={cn(
								'animate-pulse fill-yellow-400 text-yellow-500 h-3 w-3 flex-shrink-0',
								'dark:fill-yellow-500 dark:text-yellow-600',
							)}
						/>
					)}
					{isClosed && (
						<Lock className="text-red-500 dark:text-red-400 h-3 w-3 flex-shrink-0" />
					)}
					{room.level != null && room.level > 0 && (
						<Badge variant="amber" className="text-[10px] flex-shrink-0">
							Lvl {room.level}
						</Badge>
					)}
					{room.game && (
						<Badge variant="emerald" className="text-[10px] flex-shrink-0">
							{room.game}
						</Badge>
					)}
				</div>
				{openingHoursFormatted.length > 0 && (
					<div className="mt-0.5 space-y-0.5">
						{openingHoursFormatted.map((hours) => (
							<div
								key={hours}
								className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
							>
								<Clock className="h-3 w-3 flex-shrink-0" />
								<span>{hours}</span>
							</div>
						))}
					</div>
				)}
			</div>

			<div
				className={cn(
					'flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm flex-shrink-0',
					'bg-blue-100 text-blue-600',
					'dark:bg-sky-700 dark:text-sky-200',
				)}
			>
				{room.clients ?? 0}
			</div>
		</Link>
	);
}
