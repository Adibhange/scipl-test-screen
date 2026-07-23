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
	const displayHiringLoc = activeHiringLocations.find((loc) => loc.value === result.candidate.hiringLocation)?.label || result.candidate.hiringLocation || "Not assigned";

	const computedStatus = computeCandidateStatus(result);
	const badgeVariant = computedStatus === "in_interview" ? "interviewing" : (computedStatus as StatusVariant);

	const gradable = result.answers.filter((a) => a.isCorrect !== undefined);
	const correctCount = gradable.filter((a) => a.isCorrect).length;

	const durationMins = Math.round(result.secondsUsed / 60);

	return (
		<Link href={`/admin/${result.id}`} className="group block h-full animate-fade-in focus:outline-none">
			<article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-card p-5 shadow-xs hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300">
				
				{/* 1. Header Section */}
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-650 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 transition-colors duration-250 select-none shadow-3xs">
							{initials}
						</div>
						<div className="min-w-0">
							<h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
								{result.candidate.name}
							</h3>
							<p className="text-[11px] font-medium text-slate-400 dark:text-slate-450 capitalize truncate mt-0.5">
								{displayRole} • {displayExp}
							</p>
						</div>
					</div>
					<StatusBadge variant={badgeVariant} />
				</div>

				{/* 2. Contact Information Details Row */}
				<div className="mt-4 space-y-1.5">
					<DetailRow label="Email" value={result.candidate.email} icon={Mail} className="py-0.5 border-b-0 text-slate-600 dark:text-slate-400 font-semibold" />
					<DetailRow label="Phone" value={result.candidate.mobile || "—"} icon={Phone} className="py-0.5 border-b-0 text-slate-600 dark:text-slate-400 font-semibold" />
					<DetailRow label="Hiring Location" value={displayHiringLoc} icon={MapPin} className="py-0.5 border-b-0 text-slate-600 dark:text-slate-400 font-semibold" />
				</div>

				{/* 3. Performance & Proctoring Metrics Row */}
				<div className="flex flex-wrap items-center gap-2 mt-4 select-none">
					{/* Duration Pill */}
					<span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 text-[10px] rounded-lg border border-slate-100/60 dark:border-slate-800/80 shadow-3xs">
						<Clock className="h-3 w-3 text-slate-400" />
						{durationMins}m
					</span>

					{/* Proctoring Warning Pill */}
					<span className={cn(
						"inline-flex items-center gap-1.5 font-bold px-2.5 py-1 text-[10px] rounded-lg border transition-colors shadow-3xs",
						result.tabSwitches > 0 
							? "bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40" 
							: "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-slate-100/60 dark:border-slate-800/80"
					)}>
						<AlertTriangle className="h-3 w-3" />
						{result.tabSwitches} switches
					</span>

					{/* Date Pill */}
					<span className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 text-[10px] rounded-lg border border-slate-100/60 dark:border-slate-800/80 ml-auto shadow-3xs">
						<Calendar className="h-3 w-3 text-slate-450" />
						{new Date(result.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
					</span>
				</div>

				{/* 4. Recruitment Status details section */}
				<div className="my-4 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3.5">
					<div className="flex items-center justify-between text-xs font-semibold">
						<span className="text-slate-400 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-slate-400" /> Recruiter</span>
						<span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[150px]">{result.assignedInterviewerName || "Unassigned"}</span>
					</div>
					<div className="flex items-center justify-between text-xs font-semibold">
						<span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /> Round</span>
						<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{getCurrentRoundLabel(result)}</span>
					</div>
					<div className="flex items-center justify-between text-xs font-semibold">
						<span className="text-slate-400 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-slate-400" /> Evaluation</span>
						{result.totalMarksPossible && result.totalMarksPossible > 0 ? (
							<StatusBadge variant="evaluated" label={`Evaluated (${result.totalMarksAwarded ?? 0}/${result.totalMarksPossible})`} />
						) : gradable.length > 0 ? (
							<StatusBadge variant="evaluated" label={`Evaluated (${correctCount}/${gradable.length})`} />
						) : (
							<StatusBadge variant="pending" label="Pending" />
						)}
					</div>
				</div>

				{/* 5. Footer Action Button */}
				<div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-end">
					<Button 
						variant="outline" 
						size="sm" 
						className="h-9.5 w-full text-indigo-650 dark:text-indigo-400 font-bold border-indigo-200/80 bg-indigo-50/20 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 group-hover:border-indigo-400 cursor-pointer shadow-3xs"
					>
						View Submission
						<ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 duration-200" />
					</Button>
				</div>
			</article>
		</Link>
	);
}
