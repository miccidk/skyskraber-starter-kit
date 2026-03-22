export function InfoCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
			<p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
				{icon}
				{label}
			</p>
			<p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
				{value}
			</p>
		</div>
	);
}
