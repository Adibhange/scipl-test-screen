import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/metadata";

type Props = {
	activeQuestions: Question[];
	current: number;
	answeredCount: number;
	progressPercent: number;
	isExamTimeUp: boolean;
	submitting: boolean;
	roundSubmitting: boolean;
	isMcqRound: boolean;
	flagged: Record<string, boolean>;
	mcqFlagUses: number;
	statusFor: (idx: number) => "current" | "flagged" | "answered" | "unvisited";
	selectQuestion: (idx: number) => void;
	activeRoundId: number;
};

export function QuestionNavigator({
	activeQuestions,
	current,
	answeredCount,
	progressPercent,
	isExamTimeUp,
	submitting,
	roundSubmitting,
	isMcqRound,
	flagged,
	mcqFlagUses,
	statusFor,
	selectQuestion,
	activeRoundId,
}: Props) {
	const theme =
		activeRoundId === 1 ?
			{
				bgProgress: "bg-indigo-600",
				borderProgress: "border-indigo-600/20",
			}
		: activeRoundId === 2 ?
			{
				bgProgress: "bg-sky-500",
				borderProgress: "border-sky-500/20",
			}
		: {
				bgProgress: "bg-orange-500",
				borderProgress: "border-orange-500/20",
			};

	return (
		<Card className='overflow-hidden'>
			<div className='h-1 bg-muted'>
				<div
					className={cn('h-full transition-all duration-300', theme.bgProgress)}
					style={{ width: `${progressPercent}%` }}
				/>
			</div>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-3'>
					<div>
						<p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
							Progress
						</p>
						<p className='text-lg font-bold'>
							{answeredCount} / {activeQuestions.length}
						</p>
					</div>
					<div className={cn('w-10 h-10 rounded-full border-2 flex items-center justify-center', theme.borderProgress)}>
						<span className='text-[10px] font-bold'>
							{Math.round(progressPercent)}%
						</span>
					</div>
				</div>

				<div className='grid grid-cols-5 gap-1.5 mb-4'>
					{activeQuestions.map((qq, idx) => {
						const s = statusFor(idx);
						const isNavDisabled =
							isExamTimeUp ||
							submitting ||
							roundSubmitting ||
							(isMcqRound && idx > current + 1);
						
						const isCurrent = s === "current";
						const isAnswered = s === "answered";
						const isFlagged = s === "flagged";
						
						return (
							<button
								key={qq.id}
								onClick={() => selectQuestion(idx)}
								disabled={isNavDisabled}
								className={cn(
									"aspect-square rounded-md flex items-center justify-center text-[11px] font-semibold border transition-all cursor-pointer",
									isCurrent ? (
										activeRoundId === 1 ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105"
										: activeRoundId === 2 ? "bg-sky-500 text-white border-sky-500 shadow-sm scale-105"
										: "bg-orange-500 text-white border-orange-500 shadow-sm scale-105"
									)
									: isFlagged ?
										"bg-amber-100 border-amber-300 text-amber-800"
									: isAnswered ?
										"bg-emerald-50 text-emerald-700 border border-emerald-200"
									:	"bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100",
									isNavDisabled &&
										"cursor-not-allowed opacity-50",
								)}>
								{idx + 1}
							</button>
						);
					})}
				</div>
				<Separator className='mb-3' />
				<div className='space-y-2 text-[10px]'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2 text-muted-foreground'>
							<div className='w-2 h-2 rounded-full bg-muted border' /> Not
							visited
						</div>
						<div className='flex items-center gap-2 text-emerald-700 font-bold'>
							<div className='w-2 h-2 rounded-full bg-emerald-500' />{" "}
							Answered
						</div>
					</div>
					<div className='flex items-center gap-2 text-amber-700 font-bold'>
						<div className='w-2 h-2 rounded-full bg-amber-500' /> Flagged
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
