import { Clock3, FileText, Code2, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentRound } from "@/data/assessment-rounds";

export type { AssessmentRound } from "@/data/assessment-rounds";

const ROUND_ICONS = [LayoutList, FileText, Code2];
const ROUND_STYLES = [
	"from-violet-500 to-indigo-600 ring-violet-200",
	"from-sky-500 to-cyan-600 ring-sky-200",
	"from-amber-500 to-orange-600 ring-amber-200",
];

function readableTypes(types: string[]) {
	return types.map((type) => type.replace(/_/g, " ")).join(" · ");
}

export function AssessmentRoundCard({
	round,
	questionCount,
	index,
	compact = false,
}: {
	round: AssessmentRound;
	questionCount: number;
	index: number;
	compact?: boolean;
}) {
	const Icon = ROUND_ICONS[index] ?? LayoutList;
	const style = ROUND_STYLES[index] ?? ROUND_STYLES[0];

	return (
		<div
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
				compact && "p-4",
			)}>
			<div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", style)} />
			<div className='flex items-center gap-4'>
				<div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-4", style)}>
					<Icon className='size-5' aria-hidden='true' />
				</div>
				<div className='min-w-0 flex-1'>
					<p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
						Round {round.id}
					</p>
					<h3 className='mt-0.5 font-semibold text-slate-900'>{round.label} Assessment</h3>
					<p className='mt-1 truncate text-xs capitalize text-slate-500'>{readableTypes(round.types)}</p>
				</div>
				<div className='shrink-0 text-right'>
					<p className='text-lg font-bold tabular-nums text-slate-900'>{questionCount}</p>
					<p className='text-[11px] font-medium text-slate-500'>questions</p>
					<p className='mt-1 flex items-center justify-end gap-1 text-xs text-slate-500'>
						<Clock3 className='size-3' aria-hidden='true' /> {round.durationSeconds / 60} min
					</p>
				</div>
			</div>
		</div>
	);
}
