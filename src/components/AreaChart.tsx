import { useState } from 'react';

interface AreaChartProps {
	data: unknown[];
	valueKey: string;
	color: string;
	formatLabel?: (v: number) => string;
	dateKey?: string;
	tooltipFormatter?: (value: number) => string;
	showDots?: boolean;
}

export function AreaChart({
	data: rawData,
	valueKey,
	color,
	formatLabel,
	dateKey,
	tooltipFormatter,
	showDots,
}: AreaChartProps) {
	const data = rawData as Record<string, unknown>[];
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const W = 600;
	const H = 220;
	const PAD = { l: 50, r: 20, t: 20, b: 35 };
	const plotW = W - PAD.l - PAD.r;
	const plotH = H - PAD.t - PAD.b;

	const values = data.map((d) => Number(d[valueKey]) || 0);
	let min = Math.min(...values);
	let max = Math.max(...values);
	if (min === max) {
		min = 0;
		max = max + 1;
	}

	const xStep = plotW / Math.max(data.length - 1, 1);

	const points = data.map((_, i) => {
		const x = PAD.l + i * xStep;
		const y = PAD.t + plotH - ((values[i]! - min) / (max - min)) * plotH;
		return { x, y };
	});

	const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
	const areaD = `${pathD} L ${points[points.length - 1]!.x} ${PAD.t + plotH} L ${points[0]!.x} ${PAD.t + plotH} Z`;

	const gradientId = `grad-${color.replace('#', '')}`;
	const gridLines = 4;
	const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => {
		const y = PAD.t + (plotH / gridLines) * i;
		const v = max - (i / gridLines) * (max - min);
		return {
			y,
			label: formatLabel
				? formatLabel(v)
				: v >= 1_000_000
					? `${(v / 1_000_000).toFixed(1)}M`
					: v >= 1000
						? `${(v / 1000).toFixed(0)}k`
						: v.toFixed(0),
		};
	});

	const getDateStr = (d: Record<string, unknown>) => {
		const raw = (d[dateKey ?? 'period'] ?? d.period ?? d.date ?? '') as string;
		if (!raw) return '';
		const date = new Date(raw);
		if (isNaN(date.getTime())) return String(raw).slice(0, 5);
		return date.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' });
	};

	const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
		const svg = e.currentTarget.ownerSVGElement!;
		const rect = svg.getBoundingClientRect();
		const mouseX = ((e.clientX - rect.left) / rect.width) * W;
		let nearest = 0;
		let nearestDist = Infinity;
		for (let i = 0; i < points.length; i++) {
			const dist = Math.abs(points[i]!.x - mouseX);
			if (dist < nearestDist) {
				nearestDist = dist;
				nearest = i;
			}
		}
		setHoveredIndex(nearest);
	};

	const hp = hoveredIndex !== null ? points[hoveredIndex] : null;

	return (
		<div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="absolute inset-0 w-full h-full"
				onMouseLeave={() => setHoveredIndex(null)}
			>
				{gridYs.map((g) => (
					<g key={g.y}>
						<line
							x1={PAD.l}
							y1={g.y}
							x2={W - PAD.r}
							y2={g.y}
							className="stroke-slate-200 dark:stroke-slate-700"
							strokeWidth={0.5}
						/>
						<text
							x={PAD.l - 6}
							y={g.y + 3}
							textAnchor="end"
							className="fill-slate-400 dark:fill-slate-500 text-[9px]"
						>
							{g.label}
						</text>
					</g>
				))}

				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={color} stopOpacity={0.5} />
						<stop offset="100%" stopColor={color} stopOpacity={0} />
					</linearGradient>
				</defs>

				<path d={areaD} fill={`url(#${gradientId})`} opacity={0.3} />
				<path
					d={pathD}
					fill="none"
					stroke={color}
					strokeWidth={2}
					strokeLinejoin="round"
					strokeLinecap="round"
				/>

				{showDots &&
					points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />)}

				{data.length > 1 &&
					[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
						<text
							key={i}
							x={PAD.l + i * xStep}
							y={H - 6}
							textAnchor="middle"
							className="fill-slate-400 dark:fill-slate-500 text-[9px]"
						>
							{getDateStr(data[i]!)}
						</text>
					))}

				<rect
					x={PAD.l}
					y={PAD.t}
					width={plotW}
					height={plotH}
					fill="transparent"
					className="cursor-crosshair"
					onMouseMove={handleMouseMove}
				/>

				{hp && (
					<>
						<line
							x1={hp.x}
							y1={PAD.t}
							x2={hp.x}
							y2={PAD.t + plotH}
							className="stroke-slate-300 dark:stroke-slate-600"
							strokeWidth={1}
							strokeDasharray="3 3"
							style={{ pointerEvents: 'none' }}
						/>
						<circle
							cx={hp.x}
							cy={hp.y}
							r={4}
							fill={color}
							stroke="white"
							strokeWidth={2}
							style={{ pointerEvents: 'none' }}
						/>
					</>
				)}
			</svg>

			{hoveredIndex !== null &&
				hp &&
				(() => {
					const val = values[hoveredIndex]!;
					const dateStr = getDateStr(data[hoveredIndex]!);
					const text = tooltipFormatter
						? tooltipFormatter(val)
						: val.toLocaleString('da-DK');
					const showBelow = hp.y < H * 0.25;

					return (
						<div
							className="absolute pointer-events-none z-10 whitespace-nowrap rounded-lg border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs shadow-xl"
							style={{
								left: `${(hp.x / W) * 100}%`,
								top: `${(hp.y / H) * 100}%`,
								transform: showBelow
									? 'translate(-50%, 12px)'
									: 'translate(-50%, calc(-100% - 12px))',
							}}
						>
							<div className="font-medium text-slate-500 dark:text-slate-400">
								{dateStr}
							</div>
							<div className="flex items-center gap-1.5">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-full"
									style={{ backgroundColor: color }}
								/>
								<span className="font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
									{text}
								</span>
							</div>
						</div>
					);
				})()}
		</div>
	);
}
