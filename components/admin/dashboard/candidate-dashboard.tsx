import nextDynamic from "next/dynamic";
import { CandidateGridWrapper } from "@/components/admin/dashboard/candidate-grid-wrapper";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllResults } from "@/repositories/result.repository";
import { CandidateCard } from "@/components/admin/candidate-card";

const AddCandidateDialog = nextDynamic(
	() =>
		import("@/components/admin/candidates/add-candidate-dialog").then(
			(mod) => mod.AddCandidateDialog,
		),
	{
		loading: () => (
			<Button className='h-10 rounded-xl flex items-center gap-2 cursor-default bg-indigo-600/50 text-white/50 opacity-80'>
				<UserPlus className='h-4 w-4 shrink-0 opacity-50' />
				Add Candidate
			</Button>
		),
	},
);

import { ResultsFilterBar } from "@/components/admin/dashboard/results-filter-bar";
import { filterResults, computeCandidateStatus } from "@/lib/filters";
import { logger } from "@/lib/logger";
import { ROLES } from "@/constants/roles";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import type { AdminUser } from "@/repositories/admin.repository";
import { getMetadata } from "@/repositories/metadata.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ExportExcelButton } from "@/components/admin/dashboard/export-excel-button";
import {
	UsersRound,
	Route,
	BadgeCheck,
	UserX,
} from "lucide-react";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/layout-primitives";
import { MetricCard, InfoGrid } from "@/components/ui/enterprise-primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { listActiveShares } from "@/repositories/candidate-share.repository";
import { MasterSharedLinksList } from "@/components/master/master-shared-links-list";

export type CandidateDashboardSearchParams = {
	search?: string;
	evaluation?: string;
	role?: string;
	round?: string;
	hiringStatus?: string;
	hiringLocation?: string;
	dateRange?: string;
	startDate?: string;
	endDate?: string;
};

/**
 * The full candidate results dashboard: metrics, filters, and grid.
 * Shared between `/admin` (real Admin sessions) and `/master` (Master
 * sessions, via a synthetic unrestricted "hr" actor) so both land on the
 * exact same experience — `basePath` controls where each candidate card
 * links to, since Admin and Master resolve candidate detail pages at
 * different routes with different auth guards.
 */
export async function CandidateDashboard({
	searchParams,
	admin,
	basePath,
}: {
	searchParams: Promise<CandidateDashboardSearchParams>;
	admin: AdminUser;
	basePath: string;
}) {
	const rawResults = await getAllResults();
	const dbAdapter = getDatabaseAdapter();
	const activeSharesPromise = listActiveShares();
	const results = await Promise.all(
		rawResults.map(async (res) => {
			if (!res.candidate.id) return res;
			const [experiences, references] = await Promise.all([
				dbAdapter.candidateExperiences.getByCandidateId(res.candidate.id),
				dbAdapter.candidateReferences.getByCandidateId(res.candidate.id),
			]);
			return {
				...res,
				candidate: {
					...res.candidate,
					experiences,
					references,
				},
			};
		})
	);

	// Fetch dynamic configurations
	let activeRoles = ROLES.map(role => ({ value: role.value, label: role.label }));
	let activeExperiences = EXPERIENCE_LEVELS.map(exp => ({ value: exp.value, label: exp.label }));
	let activeTestLocations = [
		{ value: "home", label: "Home" },
		{ value: "pune_office", label: "Pune Office" },
		{ value: "thane_office", label: "Thane Office" }
	];

	let activeHiringLocations = [
		{ value: "pune", label: "Pune Office" },
		{ value: "thane", label: "Thane Office" },
		{ value: "bangalore", label: "Bangalore" }
	];

	try {
		const meta = await getMetadata(true);
		if (meta.roles.length > 0) activeRoles = meta.roles;
		if (meta.experience.length > 0) activeExperiences = meta.experience;
		if (meta.testLocations.length > 0) activeTestLocations = meta.testLocations;
		if (meta.hiringLocations.length > 0) activeHiringLocations = meta.hiringLocations;
	} catch (err) {
		logger.warn("Failed to fetch metadata in CandidateDashboard, using defaults", { error: String(err) });
	}
	const scopedResults =
		admin?.role === "interviewer" ?
			results.filter(
				(result) =>
					result.assignedInterviewerId === admin.userId ||
					result.assignedInterviewerEmail === admin.email,
			)
		: admin?.role === "director" ?
			results.filter(
				(result) => result.interviewRounds?.assessment?.status === "pass",
			)
		:	results;
	const {
		search = "",
		evaluation = "all",
		role = "all",
		round = "all",
		hiringStatus = "all",
		hiringLocation = "all",
		dateRange = "all",
		startDate = "",
		endDate = "",
	} = await searchParams;

	const visibleResults = filterResults(scopedResults, {
		evaluation,
		role,
		round,
		hiringStatus,
		hiringLocation,
		searchTerm: search,
		dateRange,
		startDate,
		endDate,
	});

	// Dynamic counts calculations for selector dropdown options
	const filteredForCounts = scopedResults.filter(r => {
		if (evaluation !== "all") {
			const isEvaluated = r.totalMarksAwarded !== undefined;
			if (evaluation === "pending" && isEvaluated) return false;
			if (evaluation === "evaluated" && !isEvaluated) return false;
		}
		if (hiringStatus !== "all") {
			const computed = computeCandidateStatus(r);
			const filterVal = hiringStatus === "hold" ? "on_hold" : hiringStatus;
			if (computed !== filterVal) return false;
		}
		if (hiringLocation !== "all") {
			if (r.candidate.hiringLocation !== hiringLocation) return false;
		}
		return true;
	});

	const roleCounts = Object.fromEntries([
		["all", filteredForCounts.length],
		...activeRoles.map((r) => [
			r.value,
			filteredForCounts.filter((result) => result.candidate.role === r.value).length,
		]),
	]);

	const evaluationCounts = {
		all: scopedResults.length,
		pending: scopedResults.filter((result) => result.totalMarksAwarded === undefined).length,
		evaluated: scopedResults.filter((result) => result.totalMarksAwarded !== undefined).length,
	};

	const metrics: Array<{
		label: string;
		value: number;
		Icon: typeof UsersRound;
		tone: string;
	}> = [
		{
			label: "Total Candidates",
			value: scopedResults.length,
			Icon: UsersRound,
			tone: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
		},
		{
			label: "In Interview",
			value: scopedResults.filter(
				(r) => computeCandidateStatus(r) === "in_interview"
			).length,
			Icon: Route,
			tone: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
		},
		{
			label: "Hired",
			value: scopedResults.filter(
				(r) => computeCandidateStatus(r) === "hired"
			).length,
			Icon: BadgeCheck,
			tone: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
		},
		{
			label: "Rejected",
			value: scopedResults.filter(
				(r) => computeCandidateStatus(r) === "rejected"
			).length,
			Icon: UserX,
			tone: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
		},
	];

	const activeShares = await activeSharesPromise;

	return (
		<PageContainer>
			{/* Page Header */}
			<PageHeader
				title="Candidate Results"
				actions={
					<div className="flex items-center gap-3">
						<ExportExcelButton
							visibleResults={visibleResults}
							allResults={scopedResults}
							activeRoles={activeRoles}
							activeExperiences={activeExperiences}
							activeTestLocations={activeTestLocations}
							activeHiringLocations={activeHiringLocations}
						/>
						{admin.role === "hr" && (
							<AddCandidateDialog
								rolesList={activeRoles}
								testLocationsList={activeTestLocations}
								experienceList={activeExperiences}
							/>
						)}
					</div>
				}
			/>

			{/* Metric Cards Grid */}
			<InfoGrid cols={4} className="gap-6 my-6 md:my-8">
				{metrics.map(({ label, value, Icon, tone }) => (
					<MetricCard
						key={label}
						title={label}
						value={value}
						icon={Icon}
						iconClassName={tone}
					/>
				))}
			</InfoGrid>

			{/* Shared Candidate Links */}
			<Card className="my-6 md:my-8">
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Link2 className="h-4 w-4 text-indigo-600" strokeWidth={1.8} />
						Shared Candidate Links
					</CardTitle>
				</CardHeader>
				<CardContent>
					<MasterSharedLinksList shares={activeShares} />
				</CardContent>
			</Card>

			{/* Filter & Search Toolbar */}
			<ResultsFilterBar
				evaluation={evaluation}
				role={role}
				round={round}
				hiringStatus={hiringStatus}
				hiringLocation={hiringLocation}
				search={search}
				rolesList={activeRoles}
				hiringLocationsList={activeHiringLocations}
				dateRange={dateRange}
				startDate={startDate}
				endDate={endDate}
				roleCounts={roleCounts}
				evaluationCounts={evaluationCounts}
			/>

			{/* Candidate Grid */}
			<CandidateGridWrapper>
				{visibleResults.length === 0 ? (
					<EmptyState
						title="No candidates found"
						description="We couldn't find any candidates matching your selected search query or filter options. Try expanding your date range, clearing filters, or double-checking names."
						icon={UsersRound}
					/>
				) : (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{visibleResults.map((r) => (
							<CandidateCard
								key={r.id}
								result={r}
								activeRoles={activeRoles}
								activeExperiences={activeExperiences}
								activeHiringLocations={activeHiringLocations}
								basePath={basePath}
							/>
						))}
					</div>
				)}
			</CandidateGridWrapper>
		</PageContainer>
	);
}
