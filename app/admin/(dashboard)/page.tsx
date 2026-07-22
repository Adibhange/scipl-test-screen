import Link from "next/link";
import { cn } from "@/lib/utils";
import nextDynamic from "next/dynamic";
import { CandidateGridWrapper } from "@/components/admin/dashboard/candidate-grid-wrapper";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllResults } from "@/repositories/result.repository";

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
import { filterResults } from "@/lib/filters";
import { ROLES } from "@/constants/roles";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { getCurrentAdmin, type AdminUser } from "@/repositories/admin.repository";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminLoading from "./loading";
import { getMetadata } from "@/repositories/metadata.repository";
import {
	AlertTriangle,
	ChevronRight,
	Mail,
	Phone,
	BriefcaseBusiness,
	CalendarDays,
	MapPin,
	UsersRound,
	Route,
	ClipboardCheck,
	BadgeCheck,
} from "lucide-react";
import type { CandidateResult } from "@/types";

function getCurrentRoundKey(
	result: CandidateResult,
): "face_to_face" | "assessment" | "director" {
	const rounds = result.interviewRounds;
	if (!rounds || rounds.face_to_face.status !== "pass") return "face_to_face";
	if (rounds.assessment.status !== "pass") return "assessment";
	return "director";
}

function getCurrentRoundLabel(result: CandidateResult) {
	const key = getCurrentRoundKey(result);
	return (
		key === "face_to_face" ? "Round 1"
		: key === "assessment" ? "Round 2"
		: "Round 3"
	);
}

function computeCandidateStatus(r: CandidateResult): "rejected" | "hired" | "on_hold" | "in_interview" | "screening" {
	const rounds = (r.interviewRounds || {}) as Record<string, { status?: string } | undefined>;
	const hasFail = Object.values(rounds).some((roundVal) => roundVal?.status === "fail");
	const isScoreZero = r.totalMarksAwarded !== undefined && r.totalMarksAwarded === 0;

	if (hasFail || isScoreZero || r.candidate.hiringStatus === "rejected") {
		return "rejected";
	}
	if (r.candidate.hiringStatus === "hired") {
		return "hired";
	}
	if (r.candidate.hiringStatus === "on_hold") {
		return "on_hold";
	}

	const hasPassedFaceToFace = rounds.face_to_face?.status === "pass";
	const isExamSubmitted = r.totalMarksAwarded !== undefined;
	if (hasPassedFaceToFace || isExamSubmitted || r.candidate.hiringStatus === "interviewing") {
		return "in_interview";
	}

	return "screening";
}

function getHiringStatusLabel(status?: string) {
	if (status === "on_hold") return "On hold";
	if (status === "in_interview") return "In Interview";
	return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Screening";
}

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
	const results = (await getAllResults()).sort((a, b) => {
		const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
		const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
		return dateB - dateA;
	});

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
		console.warn("Failed to fetch metadata in AdminPage, using defaults:", err);
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
		hint: string;
		Icon: typeof UsersRound;
		tone: string;
	}> = [
		{
			label: "Total Candidates",
			value: scopedResults.length,
			hint: "All submitted applications",
			Icon: UsersRound,
			tone: "bg-indigo-50 text-indigo-600",
		},
		{
			label: "In Interview",
			value: scopedResults.filter(
				(r) => getCurrentRoundKey(r) !== "face_to_face" && computeCandidateStatus(r) !== "rejected",
			).length,
			hint: "Moved beyond round one",
			Icon: Route,
			tone: "bg-sky-50 text-sky-600",
		},
		{
			label: "Awaiting Evaluation",
			value: pendingResults.filter(
				(r) => computeCandidateStatus(r) !== "rejected",
			).length,
			hint: "Assessment still needs review",
			Icon: ClipboardCheck,
			tone: "bg-amber-50 text-amber-600",
		},
		{
			label: "Hired",
			value: scopedResults.filter((r) => r.candidate.hiringStatus === "hired")
				.length,
			hint: "Final hiring decisions",
			Icon: BadgeCheck,
			tone: "bg-emerald-50 text-emerald-600",
		},
	];

	return (
		<div>
				<div className='mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
					{metrics.map(({ label, value, hint, Icon, tone }) => (
						<div
							key={label}
							className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
							<div className='flex items-start justify-between'>
								<div>
									<p className='text-xs font-semibold text-slate-500'>
										{label}
									</p>
									<p className='mt-2 text-3xl font-bold tracking-tight text-slate-900'>
										{value}
									</p>
								</div>
								<div
									className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
									<Icon className='h-5 w-5' />
								</div>
							</div>
							<p className='mt-3 text-xs text-slate-500'>{hint}</p>
						</div>
					))}
				</div>
				<div className='mb-7 flex items-center justify-between'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.25em] text-primary'>
							Assessment intake
						</p>
						<h1 className='mt-2 text-2xl font-bold'>
							Candidate Results
							<span className='ml-2 text-base font-normal text-muted-foreground'>
								({visibleResults.length})
							</span>
						</h1>
					</div>
					{admin.role === "hr" && (
						<AddCandidateDialog
							rolesList={activeRoles}
							testLocationsList={activeTestLocations}
							experienceList={activeExperiences}
						/>
					)}
				</div>

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

				<CandidateGridWrapper>
				{visibleResults.length === 0 && (
					<div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm max-w-xl mx-auto my-8 animate-fade-in'>
						<div className='flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-6'>
							<UsersRound className='h-8 w-8' />
						</div>
						<h3 className='text-lg font-bold text-slate-900 mb-2'>
							No candidates found
						</h3>
						<p className='text-sm text-slate-500 mb-6 max-w-sm'>
							We couldn&apos;t find any candidates matching your selected search query or filter options.
						</p>
						<div className='w-full text-left bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100'>
							<h4 className='text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3'>
								Suggestions to broaden your search:
							</h4>
							<ul className='text-xs text-slate-600 space-y-2 list-disc list-inside'>
								<li>Double-check spelling of candidate names, emails, or locations.</li>
								<li>Select &quot;All Time&quot; or expand your date range window.</li>
								<li>Change or clear active filters (roles, rounds, locations).</li>
							</ul>
						</div>
					</div>
				)}

				<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{visibleResults.map((r) => {
						const gradable = r.answers.filter((a) => a.isCorrect !== undefined);
						const correctCount = gradable.filter((a) => a.isCorrect).length;
						const scorePct =
							gradable.length ? correctCount / gradable.length : null;
						const initials =
							r.candidate.name
								.split(" ")
								.filter(Boolean)
								.slice(0, 2)
								.map((name) => name[0])
								.join("")
								.toUpperCase() || "—";
							const displayRole = activeRoles.find((roleOpt) => roleOpt.value === r.candidate.role)?.label || r.candidate.role;
							const displayExp = activeExperiences.find((expOpt) => expOpt.value === r.candidate.experience)?.label || r.candidate.experience;
							const displayTestLoc = activeTestLocations.find((loc) => loc.value === r.candidate.testLocation)?.label || r.candidate.testLocation || "Home";
							const displayHiringLoc = activeHiringLocations.find((loc) => loc.value === r.candidate.hiringLocation)?.label || r.candidate.hiringLocation || "Not assigned";

						return (
							<div
								key={r.id}
								className='relative h-full'>
								<Link
									href={`/admin/${r.id}`}
									className='group block h-full capitalize'>
									<article className='flex min-h-80 h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg'>
										<div className='h-1.5 w-full bg-[#4F46E5]' />

										<div className='flex flex-1 flex-col p-5'>
											<div className='flex items-start justify-between gap-3'>
												<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
													{initials}
												</div>
												{r.tabSwitches > 0 && (
													<span className='flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive'>
														<AlertTriangle
															className='h-3 w-3'
															strokeWidth={1.5}
														/>
														{r.tabSwitches}
													</span>
												)}
												{(() => {
													const computedStatus = computeCandidateStatus(r);
													const label = getHiringStatusLabel(computedStatus);
													const badgeColorClass = 
														computedStatus === "rejected" ? "border-red-200 bg-red-50 text-red-700"
														: computedStatus === "hired" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
														: computedStatus === "in_interview" ? "border-indigo-200 bg-indigo-50 text-indigo-700"
														: computedStatus === "on_hold" ? "border-amber-200 bg-amber-50 text-amber-700"
														: "border-slate-200 bg-slate-50 text-slate-600";

													return (
														<span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", badgeColorClass)}>
															{label}
														</span>
													);
												})()}
											</div>
											<div className='mt-4 min-w-0'>
												<p className='truncate text-base font-semibold text-foreground'>
													{r.candidate.name}
												</p>
												<p className='mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
													<Mail className='h-3.5 w-3.5 shrink-0' />
													{r.candidate.email}
												</p>
												<p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
													<Phone className='h-3.5 w-3.5 shrink-0' />
													{r.candidate.mobile}
												</p>
											</div>

											<div className='mt-5 space-y-2 border-t pt-4 text-xs text-slate-500 border-slate-100'>
												<p className='flex items-center gap-2'>
													<BriefcaseBusiness className='h-3.5 w-3.5 shrink-0 text-primary' />
													<span className='truncate font-medium'>
														{displayRole} · {displayExp}
													</span>
												</p>
												<p className='flex items-center gap-2'>
													<MapPin className='h-3.5 w-3.5 shrink-0 text-primary' />
													<span className='font-medium'>
														{displayTestLoc} · Hiring: {displayHiringLoc}
													</span>
												</p>
												<p className='flex items-center gap-2'>
													<CalendarDays className='h-3.5 w-3.5 shrink-0 text-primary' />
													<span className='font-medium'>
														{new Date(r.submittedAt).toLocaleDateString()}
													</span>
												</p>
											</div>

											<div className='mt-auto flex items-center justify-between gap-2 pt-4'>
												<span className='rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium'>
													{getCurrentRoundLabel(r)}
												</span>
												{r.totalMarksAwarded !== undefined ?
													<span className='rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary'>
														Total: {r.totalMarksAwarded}/{r.totalMarksPossible}
													</span>
												: gradable.length > 0 ?
													<span
														className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
															scorePct !== null && scorePct >= 0.6 ?
																"border-green-500/20 bg-green-500/10 text-green-600"
															:	"border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
														}`}>
														Score: {correctCount}/{gradable.length}
													</span>
												:	<span className='text-xs text-muted-foreground'>
														View submission
													</span>
												}
												<ChevronRight className='h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary' />
											</div>
										</div>
									</article>
								</Link>
							</div>
						);
					})}
				</div>
				</CandidateGridWrapper>
			</div>
	);
}
