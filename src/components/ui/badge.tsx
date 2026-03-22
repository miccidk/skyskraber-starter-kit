import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
	variants: {
		variant: {
			default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
			amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
			outline:
				'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
