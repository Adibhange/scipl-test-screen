import { Search, Users, Link2, UserCheck, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllResults } from "@/repositories/result.repository";
import { listActiveShares } from "@/repositories/candidate-share.repository";
import { MasterCandidateBrowser, type MasterCandidateRow } from "@/components/master/master-candidate-browser";
import { MasterSharedLinksList } from "@/components/master/master-shared-links-list";

export const dynamic = "force-dynamic";

function StatCard({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Users;
	label: string;
	value: number;
}) {
	return (
		<Card>
			<CardContent className="flex items-center gap-3 py-4">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10">
					<Icon className="h-4 w-4 text-brand-navy" strokeWidth={1.8} />
				</div>
				<div>
					<p className="text-xl font-bold text-brand-navy leading-none">{value}</p>
					<p className="text-xs text-muted-foreground">{label}</p>
				</div>
			</CardContent>
		</Card>
	);
}

export default async function MasterDashboardPage() {
	const [results, activeShares] = await Promise.all([getAllResults(), listActiveShares()]);

	const candidates: MasterCandidateRow[] = results
		.filter((r) => !!r.candidate?.id)
		.map((r) => ({
			id: r.candidate.id as string,
			name: r.candidate.name,
			email: r.candidate.email,
			mobile: r.candidate.mobile,
			role: r.candidate.role,
			hiringStatus: r.candidate.hiringStatus,
			submittedAt: r.submittedAt,
		}))
		.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

	const hiredCount = candidates.filter((c) => c.hiringStatus === "hired").length;
	const interviewingCount = candidates.filter((c) => c.hiringStatus === "interviewing").length;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-brand-navy">Master Dashboard</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Unrestricted candidate access for company directors and senior management.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard icon={Users} label="Total Candidates" value={candidates.length} />
				<StatCard icon={UserCheck} label="Hired" value={hiredCount} />
				<StatCard icon={CalendarClock} label="In Interview" value={interviewingCount} />
				<StatCard icon={Link2} label="Active Share Links" value={activeShares.length} />
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Search className="h-4 w-4 text-brand-navy" strokeWidth={1.8} />
						Candidate Search
					</CardTitle>
				</CardHeader>
				<CardContent>
					<MasterCandidateBrowser candidates={candidates} mode="search" />
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Users className="h-4 w-4 text-brand-navy" strokeWidth={1.8} />
							Recent Candidates
						</CardTitle>
					</CardHeader>
					<CardContent>
						<MasterCandidateBrowser candidates={candidates} mode="recent" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Link2 className="h-4 w-4 text-brand-navy" strokeWidth={1.8} />
							Shared Candidate Links
						</CardTitle>
					</CardHeader>
					<CardContent>
						<MasterSharedLinksList shares={activeShares} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
