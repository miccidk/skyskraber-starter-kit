export function Footer() {
	return (
		<footer className="flex-shrink-0 border-t border-slate-200/80 dark:border-slate-800/80">
			<div className="mx-auto max-w-6xl px-4 py-6">
				<div className="flex flex-col items-center gap-2 text-center text-xs text-slate-400 dark:text-slate-600">
					<p>
						Fan site til{' '}
						<a
							href="https://www.skyskraber.dk"
							target="_blank"
							rel="noopener noreferrer"
							className="text-sky-blue hover:underline font-medium"
						>
							Skyskraber
						</a>{' '}
						&mdash; ikke officielt tilknyttet.
					</p>
					<p className="text-slate-300 dark:text-slate-700">
						Bygget med Skyskraber Starter Kit
					</p>
				</div>
			</div>
		</footer>
	);
}
