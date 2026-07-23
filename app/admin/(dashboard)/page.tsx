
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
import { filterResults, computeCandidateStatus, getCurrentRoundKey } from "@/lib/filters";
import { logger } from "@/lib/logger";
import { ROLES } from "@/constants/roles";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { getCurrentAdmin, type AdminUser } from "@/repositories/admin.repository";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminLoading from "./loading";
import { getMetadata } from "@/repositories/metadata.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ExportExcelButton } from "@/components/admin/dashboard/export-excel-button";
import {
	UsersRound,
	Route,
	ClipboardCheck,
	BadgeCheck,
} from "lucide-react";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/layout-primitives";
import { MetricCard, InfoGrid } from "@/components/ui/enterprise-primitives";



export const dynamic = "force-dynamic";

export default async function AdminPage({
	searchParams,
}: {
	searchParams: Promise<{
		status?: string;
		role?: string;
		round?: string;
		testLocation?: string;
		hiringLocation?: string;
		dateRange?: string;
		startDate?: string;
		endDate?: string;
	}>;
}) {
	const admin = await getCurrentAdmin();
	if (!admin) redirect("/admin/login");

	return (
		<Suspense fallback={<AdminLoading />}>
			<CandidateDashboardContent searchParams={searchParams} admin={admin} />
		</Suspense>
	);
}

async function CandidateDashboardContent({
	searchParams,
	admin,
}: {
	searchParams: Promise<{
		status?: string;
		role?: string;
		round?: string;
		testLocation?: string;
		hiringLocation?: string;
		dateRange?: string;
		startDate?: string;
		endDate?: string;
	}>;
	admin: AdminUser;
}) {
	const rawResults = await getAllResults();
	const dbAdapter = getDatabaseAdapter();
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
		logger.warn("Failed to fetch metadata in AdminPage, using defaults", { error: String(err) });
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
		status = "all",
		role = "all",
		round = "all",
		testLocation = "all",
		hiringLocation = "",
		dateRange = "all",
		startDate = "",
		endDate = "",
	} = await searchParams;
	const pendingResults = scopedResults.filter(
		(result) => result.totalMarksAwarded === undefined,
	);
	const evaluatedResults = scopedResults.filter(
		(result) => result.totalMarksAwarded !== undefined,
	);
	const statusResults =
		status === "pending" ? pendingResults
		: status === "evaluated" ? evaluatedResults
		: scopedResults;

	const visibleResults = filterResults(scopedResults, {
		status,
		role,
		round,
		testLocation,
		searchTerm: hiringLocation,
		dateRange,
		startDate,
		endDate,
	});
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
			tone: "bg-indigo-50 text-indigo-600",
		},
		{
			label: "In Interview",
			value: scopedResults.filter(
				(r) => getCurrentRoundKey(r) !== "face_to_face" && computeCandidateStatus(r) !== "rejected",
			).length,
			Icon: Route,
			tone: "bg-sky-50 text-sky-600",
		},
		{
			label: "Awaiting Evaluation",
			value: pendingResults.filter(
				(r) => computeCandidateStatus(r) !== "rejected",
			).length,
			Icon: ClipboardCheck,
			tone: "bg-amber-50 text-amber-600",
		},
		{
			label: "Hired",
			value: scopedResults.filter((r) => r.candidate.hiringStatus === "hired")
				.length,
			Icon: BadgeCheck,
			tone: "bg-emerald-50 text-emerald-600",
		},
	];

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
			<InfoGrid cols={4}>
				{metrics.map(({ label, value, Icon }) => (
					<MetricCard
						key={label}
						title={label}
						value={value}
						icon={Icon}
					/>
				))}
			</InfoGrid>

			{/* Filter & Search Toolbar */}
			<ResultsFilterBar
				status={status}
				role={role}
				statusCounts={{
					all: scopedResults.length,
					pending: pendingResults.length,
					evaluated: evaluatedResults.length,
				}}
				roleCounts={Object.fromEntries([
					["all", statusResults.length],
					...activeRoles.map((role) => [
						role.value,
						statusResults.filter(
							(result) => result.candidate.role === role.value,
						).length,
					]),
				])}
				round={round}
				testLocation={testLocation}
				hiringLocation={hiringLocation}
				rolesList={activeRoles}
				testLocationsList={activeTestLocations}
				dateRange={dateRange}
				startDate={startDate}
				endDate={endDate}
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
								activeTestLocations={activeTestLocations}
								activeHiringLocations={activeHiringLocations}
							/>
						))}
					</div>
				)}
			</CandidateGridWrapper>
		</PageContainer>
	);
}
