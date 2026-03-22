import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notifyAuthChange } from '@/hooks/use-auth';
import { exchangeCode } from '@/lib/oauth';
import { saveTokens } from '@/lib/token-store';

export const Route = createFileRoute('/callback')({
	component: CallbackPage,
});

function CallbackPage() {
	const navigate = useNavigate();
	const handled = useRef(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (handled.current) return;
		handled.current = true;

		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const state = params.get('state');
		const savedState = sessionStorage.getItem('oauth_state');
		const errorParam = params.get('error');
		const errorDesc = params.get('error_description');

		if (errorParam) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot initialization, not a cascading render
			setError(errorDesc || errorParam);
			return;
		}

		if (!code || !state || state !== savedState) {
			setError('Ugyldigt login-forsøg: manglende kode eller ugyldig state.');
			return;
		}

		exchangeCode(code)
			.then((tokens) => {
				saveTokens(
					tokens.access_token,
					tokens.refresh_token,
					tokens.expires_in,
					tokens.user_id,
				);
				notifyAuthChange();
				void navigate({ to: '/' });
			})
			.catch((err: unknown) => {
				console.error('Token exchange failed:', err);
				setError(err instanceof Error ? err.message : 'Token-udveksling fejlede.');
			});
	}, [navigate]);

	if (error) {
		return (
			<div className="flex items-center justify-center py-20">
				<Card className="max-w-md">
					<CardContent className="space-y-4 p-6 text-center">
						<h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
							Login fejlede
						</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
						<Button variant="primary" onClick={() => void navigate({ to: '/' })}>
							Gå til forsiden
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center py-20">
			<p className="text-slate-500 dark:text-slate-400">Logger ind...</p>
		</div>
	);
}
