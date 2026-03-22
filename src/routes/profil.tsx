import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { AvatarCanvas } from '@/components/AvatarCanvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { fetchUserProfile } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { AuthGate } from '@/routes/-auth-gate';
import type { UserProfile } from '@/types/api';

export const Route = createFileRoute('/profil')({
	component: ProfilPage,
});

function ProfilPage() {
	const { isAuthenticated, userId, login } = useAuth();

	if (!isAuthenticated || !userId) {
		return (
			<AuthGate
				title="Min Profil"
				description="Log ind for at se din profil."
				login={login}
			/>
		);
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Min Profil</h1>
			<ProfileContent userId={userId} />
		</div>
	);
}

function ProfileContent({ userId }: { userId: number }) {
	const { data: profile, isLoading } = useQuery({
		queryKey: queryKeys.user(userId),
		queryFn: () => fetchUserProfile(userId),
	});

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
						<Skeleton className="h-[120px] w-[120px] rounded-lg" />
						<div className="flex-1 space-y-3 w-full">
							<Skeleton className="h-7 w-40" />
							<div className="grid grid-cols-2 gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!profile) return null;

	const avatarData = {
		sex: profile.sex,
		skinTone: profile.skinTone,
		avatarImage: profile.avatarImage,
		wearables: profile.wearables ?? [],
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-bold">{profile.username}</CardTitle>
				</CardHeader>
				<CardContent>
					<UserDetails profile={profile} avatarData={avatarData} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Info</CardTitle>
				</CardHeader>
				<CardContent>
					<ProfileInfo profile={profile} />
				</CardContent>
			</Card>

			{profile.profileText && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Profiltekst</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
							{profile.profileText}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function UserDetails({
	profile,
	avatarData,
}: {
	profile: UserProfile;
	avatarData: {
		sex: string;
		skinTone: string | number;
		avatarImage: string;
		wearables: typeof profile.wearables;
	};
}) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-[30%_70%]">
			<div className="space-y-3">
				<Detail label="Onlinetid" value={formatOnlineTime(profile.onlineTime)} />
				<Detail
					label="Lyn"
					value={`${profile.activityPoints.toLocaleString('da-DK')} lyn`}
				/>
				<Detail label="Level" value={String(profile.level)} />
				<Detail
					label="Sky+"
					value={profile.isSubscribed ? 'Sky+ medlem' : 'Ikke Sky+ medlem'}
				/>
				{profile.isMentor && <Detail label="Rolle" value="Mentor" />}
			</div>
			<div className="flex-1 flex justify-center">
				<div>
					<p className="font-bold leading-none flex items-center gap-x-2 mb-1 text-sm text-slate-900 dark:text-slate-100">
						<YellowDot />
						Udseende
					</p>
					<AvatarCanvas data={avatarData} size={120} />
				</div>
			</div>
		</div>
	);
}

function ProfileInfo({ profile }: { profile: UserProfile }) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<Detail label="Navn" value={profile.name ?? 'N/A'} />
			<Detail
				label="Alder"
				value={profile.birthdate ? calculateAge(profile.birthdate) : 'N/A'}
			/>
			<Detail label="Oprettet" value={formatDate(profile.createdAt)} />
			<Detail
				label="Sidst set"
				value={profile.isOnline ? 'Online' : formatDate(profile.lastSeen)}
			/>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="font-bold leading-none flex items-center gap-x-2 text-sm text-slate-900 dark:text-slate-100">
				<YellowDot />
				{label}
			</p>
			<p className="text-sm text-slate-600 dark:text-slate-300 leading-none">{value}</p>
		</div>
	);
}

function YellowDot() {
	return <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />;
}

function formatOnlineTime(time: { hours: number; minutes: number }): string {
	const { hours, minutes } = time;
	if (hours === 0 && minutes === 0) return '0 timer';
	if (hours === 0) return `${minutes} minutter`;
	if (minutes === 0) return hours === 1 ? '1 time' : `${hours} timer`;
	return `${hours === 1 ? '1 time' : `${hours} timer`} ${minutes} minutter`;
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	const date = d.toLocaleDateString('da-DK', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
	const time = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
	return `${date} ${time}`;
}

function calculateAge(birthdate: string): string {
	const birth = new Date(birthdate);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const monthDiff = today.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
		age--;
	}
	return `${age} år`;
}
