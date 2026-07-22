import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
	Mail, 
	Phone, 
	MapPin, 
	Clock, 
	AlertTriangle, 
	ChevronRight, 
	Calendar, 
	UserCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateResult } from "@/types";
import { StatusBadge, DetailRow, type StatusVariant } from "@/components/ui/enterprise-primitives";
import { computeCandidateStatus, getCurrentRoundKey } from "@/lib/filters";

interface CandidateCardProps {
	result: CandidateResult;
	activeRoles: Array<{ value: string; label: string }>;
	activeExperiences: Array<{ value: string; label: string }>;
	activeTestLocations: Array<{ value: string; label: string }>;
	activeHiringLocations: Array<{ value: string; label: string }>;
}

function getCurrentRoundLabel(result: CandidateResult) {
	const key = getCurrentRoundKey(result);
	return (
		key === "face_to_face" ? "Round 1"
		: key === "assessment" ? "Round 2"
		: "Round 3"
	);
}

export function CandidateCard({
	result,
	activeRoles,
	activeExperiences,
	activeTestLocations,
	activeHiringLocations,
}: CandidateCardProps) {
	const initials = result.candidate.name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((name) => name[0])
		.join("")
		.toUpperCase() || "—";

	const displayRole = activeRoles.find((roleOpt) => roleOpt.value === result.candidate.role)?.label || result.candidate.role;
	const displayExp = activeExperiences.find((expOpt) => expOpt.value === result.candidate.experience)?.label || result.candidate.experience;
	const displayTestLoc = activeTestLocations.find((loc) => loc.value === result.candidate.testLocation)?.label || result.candidate.testLocation || "Home";
	const displayHiringLoc = activeHiringLocations.find((loc) => loc.value === result.candidate.hiringLocation)?.label || result.candidate.hiringLocation || "Not assigned";

	const computedStatus = computeCandidateStatus(result);
	const badgeVariant = computedStatus === "in_interview" ? "interviewing" : (computedStatus as StatusVariant);

	const gradable = result.answers.filter((a) => a.isCorrect !== undefined);
	const correctCount = gradable.filter((a) => a.isCorrect).length;

	const durationMins = Math.round(result.secondsUsed / 60);

	return (
		<Link href={`/admin/${result.id}`} className="group block h-full animate-fade-in">
			<article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-900 transition-all duration-200">
				{/* 1. Header Section */}
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 group-hover:text-indigo-600 transition-colors">
							{initials}
						</div>
						<div className="min-w-0">
							<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-sans tracking-tight truncate">
								{result.candidate.name}
							</h3>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize truncate">
								{displayRole} • {displayExp}
							</p>
						</div>
					</div>
					<StatusBadge variant={badgeVariant} />
				</div>

				{/* 2. Compact Detail Rows */}
				<div className="my-3 space-y-0.5 border-t border-b border-border/40 py-2">
					<DetailRow label="Email" value={result.candidate.email} icon={Mail} className="py-1 border-b-0" />
					<DetailRow label="Phone" value={result.candidate.mobile} icon={Phone} className="py-1 border-b-0" />
					<DetailRow label="Location" value={`${displayTestLoc} → ${displayHiringLoc}`} icon={MapPin} className="py-1 border-b-0" />
				</div>

				{/* 3. Performance & Proctoring Metrics Row */}
				<div className="flex flex-wrap items-center gap-2 mb-4">
					{/* Score Pill */}
					{result.totalMarksPossible && result.totalMarksPossible > 0 ? (
						<span className="inline-flex items-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/50 font-bold px-2 py-0.5 text-[10px] rounded-md uppercase tracking-wider">
							Score: {result.totalMarksAwarded ?? 0}/{result.totalMarksPossible}
						</span>
					) : gradable.length > 0 ? (
						<span className="inline-flex items-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/50 font-bold px-2 py-0.5 text-[10px] rounded-md uppercase tracking-wider">
							Score: {correctCount}/{gradable.length}
						</span>
					) : (
						<span className="inline-flex items-center bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 font-bold px-2 py-0.5 text-[10px] rounded-md uppercase tracking-wider">
							Not Evaluated
						</span>
					)}

					{/* Duration Pill */}
					<span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 text-[10px] rounded-md border border-border/40">
						<Clock className="h-3 w-3" />
						{durationMins}m
					</span>

					{/* Proctoring Warning Pill */}
					<span className={cn(
						"inline-flex items-center gap-1 font-bold px-2 py-0.5 text-[10px] rounded-md border",
						result.tabSwitches > 0 
							? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/50 shadow-xs" 
							: "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold border-border/40"
					)}>
						<AlertTriangle className="h-3 w-3" />
						{result.tabSwitches} switches
					</span>

					{/* Date Pill */}
					<span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 text-[10px] rounded-md border border-border/40 ml-auto">
						<Calendar className="h-3 w-3" />
						{new Date(result.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
					</span>
				</div>

				{/* 4. Footer Action Bar */}
				<div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3">
					<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
						<UserCheck className="h-3.5 w-3.5 text-slate-400" />
						<span className="truncate max-w-[120px]">
							{result.assignedInterviewerName ? result.assignedInterviewerName : "Unassigned"}
						</span>
					</div>

					<span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/20">
						{getCurrentRoundLabel(result)}
					</span>

					<Button variant="outline" size="sm" className="h-8 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 gap-1">
						View Submission
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>
			</article>
		</Link>
	);
}
