import { CheckCircle2, CircleDot, Code2, FileText, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentRound } from "@/constants/assessment-rounds";

const ROUND_ICONS = [LayoutList, FileText, Code2];

export function AssessmentStatusBar({
	rounds,
	activeIndex,
	completedRounds,
}: {
	rounds: AssessmentRound[];
	activeIndex: number;
	completedRounds: number[];
}) {
	return (
		<div className='rounded-2xl border border-slate-200 bg-white p-2 shadow-sm'>
			<div className={cn("grid gap-1", rounds.length === 1 ? "grid-cols-1" : "grid-cols-3")}>
				{rounds.map((round, index) => {
					const completed = completedRounds.includes(round.id);
					const active = index === activeIndex;
					const Icon = ROUND_ICONS[index] ?? LayoutList;

					return (
						<div
							key={round.id}
							className={cn(
								"relative min-w-0 rounded-xl px-3 py-3 transition-colors sm:px-4",
								active && "bg-slate-950 text-white shadow-lg shadow-slate-950/15",
								completed && "bg-emerald-50 text-emerald-800",
								!active && !completed && "text-slate-400",
							)}>
							<div className='flex items-center gap-2'>
								<div className={cn(
									"flex size-7 shrink-0 items-center justify-center rounded-full",
									active && "bg-white/15",
									completed && "bg-emerald-200 text-emerald-700",
									!active && !completed && "bg-slate-100",
								)}>
									{completed ? <CheckCircle2 className='size-4' /> : active ? <CircleDot className='size-4' /> : <Icon className='size-4' />}
								</div>
								<div className='min-w-0'>
									<p className='text-[10px] font-semibold uppercase tracking-wider opacity-70'>Round {round.id}</p>
									<p className='truncate text-xs font-bold sm:text-sm'>{round.label}</p>
								</div>
							</div>
							{active && <span className='absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-white' />}
						</div>
					);
				})}
			</div>
		</div>
	);
}
