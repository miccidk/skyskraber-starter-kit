import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function AuthGate({
	title,
	description,
	login,
}: {
	title: string;
	description: string;
	login: () => void;
}) {
	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<Card className="max-w-md text-center">
				<CardContent className="space-y-4 p-8">
					<h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
						{title}
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
					<Button variant="primary" onClick={login}>
						Log ind med Skyskraber
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
