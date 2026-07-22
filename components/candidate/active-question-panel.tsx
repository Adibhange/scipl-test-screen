import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Question } from "@/types/metadata";
import type { AnswerValue } from "@/types/candidate";
import type { AssessmentRound } from "@/constants/assessment-rounds";
import { CodeEditor } from "./code-editor";
import { Flag, Send, ChevronRight, ChevronLeft, CheckCircle2, Terminal } from "lucide-react";

type Props = {
	q: Question;
	current: number;
	setCurrent: React.Dispatch<React.SetStateAction<number>>;
	activeQuestions: Question[];
	answers: Record<string, AnswerValue>;
	draftAnswers: Record<string, AnswerValue>;
	flagged: Record<string, boolean>;
	mcqFlagUses: number;
	isMcqRound: boolean;
	canFlagCurrent: boolean;
	displayedAnswer: AnswerValue | undefined;
	isExamTimeUp: boolean;
	submitting: boolean;
	roundSubmitting: boolean;
	roundIdx: number;
	activeRound: AssessmentRound;
	ROUNDS: AssessmentRound[];
	setAnswer: (val: AnswerValue) => void;
	toggleFlag: () => void;
	saveCurrentAnswer: () => void;
	saveAndNext: () => void;
	setIsConfirmingSubmit: React.Dispatch<React.SetStateAction<boolean>>;
};

export function ActiveQuestionPanel({
	q,
	current,
	setCurrent,
	activeQuestions,
	answers,
	draftAnswers,
	flagged,
	mcqFlagUses,
	isMcqRound,
	canFlagCurrent,
	displayedAnswer,
	isExamTimeUp,
	submitting,
	roundSubmitting,
	roundIdx,
	activeRound,
	ROUNDS,
	setAnswer,
	toggleFlag,
	saveCurrentAnswer,
	saveAndNext,
	setIsConfirmingSubmit,
}: Props) {
	return (
		<Card>
			<CardContent className='p-0'>
				<div className='flex items-center justify-between px-6 py-3 border-b bg-muted/20'>
					<div className='flex items-center gap-3'>
						<Badge
							variant='outline'
							className='bg-background font-mono'>
							{q.topic}
						</Badge>
						<div className='h-4 w-px bg-border' />
						<span className='text-xs font-medium'>
							Question {current + 1} of {activeQuestions.length}
						</span>
						<div className='h-4 w-px bg-border' />
						<Badge
							variant='secondary'
							className='text-[10px] font-bold'>
							{q.marks} MARKS
						</Badge>
						{q.type === "mcq_single" || q.type === "output_prediction" ?
							<Badge
								variant='secondary'
								className='text-[10px] font-bold'>
								SINGLE CHOICE
							</Badge>
							: q.type === "mcq_multi" ?
								<Badge
									variant='secondary'
									className='text-[10px] font-bold'>
									MULTIPLE CHOICE
								</Badge>
								: null}
					</div>
					<div className='flex items-center gap-3'>
						{isMcqRound && (
							<Button
								variant={flagged[q.id] ? "secondary" : "outline"}
								size='sm'
								onClick={toggleFlag}
								disabled={!canFlagCurrent}
								className={flagged[q.id] ? "text-amber-700 font-bold border-amber-250 bg-amber-50" : "font-bold text-xs"}>
								<Flag className='w-3.5 h-3.5 mr-1.5' />
								{flagged[q.id] ?
									"Unflag"
									: `Flag & next (${mcqFlagUses}/5)`}
							</Button>
						)}
					</div>
				</div>

				<div className='px-6 py-5 space-y-4'>
					<p className='text-sm leading-relaxed font-bold'>{q.stem}</p>

					{q.code && (
						<pre className='text-xs bg-muted border rounded-md p-4 overflow-x-auto font-mono text-slate-800'>
							{q.code}
						</pre>
					)}

					{(q.type === "mcq_single" || q.type === "output_prediction") &&
						q.options && (
							<RadioGroup
								value={(displayedAnswer as string) ?? ""}
								onValueChange={(val) => setAnswer(val)}
								disabled={isExamTimeUp || submitting || roundSubmitting}
								className='grid gap-3'>
								{q.options.map((opt, i) => {
									const isSelected = displayedAnswer === opt.id;
									const optionContainerClass = isSelected ? (
										activeRound.id === 1 ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10 shadow-sm"
											: activeRound.id === 2 ? "border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/10 shadow-sm"
												: "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/10 shadow-sm"
									) : "hover:bg-slate-50 border-transparent bg-slate-50/50";

									const optionLetterClass = isSelected ? (
										activeRound.id === 1 ? "border-indigo-600 text-indigo-600 bg-white"
											: activeRound.id === 2 ? "border-sky-500 text-sky-600 bg-white"
												: "border-orange-500 text-orange-600 bg-white"
									) : "border-slate-200 text-slate-500 group-hover:border-slate-350";

									const checkIconClass = isSelected ? (
										activeRound.id === 1 ? "text-indigo-600"
											: activeRound.id === 2 ? "text-sky-600"
												: "text-orange-600"
									) : "";

									return (
										<div
											key={opt.id}
											onClick={() => {
												if (isExamTimeUp || submitting || roundSubmitting) return;
												setAnswer(opt.id);
											}}
											className={cn(
												"flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all group",
												isExamTimeUp || submitting || roundSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer",
												optionContainerClass
											)}>
											<div
												className={cn(
													"w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
													optionLetterClass
												)}>
												{String.fromCharCode(65 + i)}
											</div>
											<RadioGroupItem
												value={opt.id}
												id={`${q.id}-${opt.id}`}
												disabled={isExamTimeUp || submitting || roundSubmitting}
												className='sr-only'
											/>
											<Label
												htmlFor={`${q.id}-${opt.id}`}
												className={cn(
													"flex-1 font-semibold text-sm leading-snug text-slate-700",
													isExamTimeUp || submitting || roundSubmitting ? "cursor-not-allowed" : "cursor-pointer",
												)}>
												{opt.text}
											</Label>
											{isSelected && (
												<CheckCircle2 className={cn('w-4 h-4 animate-in zoom-in-50', checkIconClass)} />
											)}
										</div>
									);
								})}
							</RadioGroup>
						)}

					{q.type === "mcq_multi" && q.options && (
						<div className='grid gap-3'>
							{q.options.map((opt, i) => {
								const cur = (displayedAnswer as string[]) || [];
								const selected = cur.includes(opt.id);
								const toggle = () => {
									if (isExamTimeUp || submitting || roundSubmitting) return;
									const next =
										selected ?
											cur.filter((c) => c !== opt.id)
											: [...cur, opt.id];
									setAnswer(next);
								};

								const optionContainerClass = selected ? (
									activeRound.id === 1 ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10 shadow-sm"
										: activeRound.id === 2 ? "border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/10 shadow-sm"
											: "border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/10 shadow-sm"
								) : "hover:bg-slate-50 border-transparent bg-slate-50/50";

								const optionLetterClass = selected ? (
									activeRound.id === 1 ? "border-indigo-600 text-indigo-600 bg-white"
										: activeRound.id === 2 ? "border-sky-500 text-sky-600 bg-white"
											: "border-orange-500 text-orange-600 bg-white"
								) : "border-slate-200 text-slate-500 group-hover:border-slate-350";

								const checkIconClass = selected ? (
									activeRound.id === 1 ? "text-indigo-600"
										: activeRound.id === 2 ? "text-sky-600"
											: "text-orange-600"
								) : "";

								return (
									<div
										key={opt.id}
										onClick={toggle}
										className={cn(
											"flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all group",
											isExamTimeUp || submitting || roundSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer",
											optionContainerClass
										)}>
										<div
											className={cn(
												"w-6 h-6 rounded-md border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
												optionLetterClass
											)}>
											{String.fromCharCode(65 + i)}
										</div>
										<Checkbox
											id={`${q.id}-${opt.id}`}
											checked={selected}
											onCheckedChange={toggle}
											disabled={isExamTimeUp || submitting || roundSubmitting}
											className='sr-only'
										/>
										<Label
											htmlFor={`${q.id}-${opt.id}`}
											className={cn(
												"flex-1 font-semibold text-sm leading-snug text-slate-700",
												isExamTimeUp || submitting || roundSubmitting ? "cursor-not-allowed" : "cursor-pointer",
											)}>
											{opt.text}
										</Label>
										{selected && (
											<CheckCircle2 className={cn('w-4 h-4 animate-in zoom-in-50', checkIconClass)} />
										)}
									</div>
								);
							})}
						</div>
					)}

					{(q.type === "coding" || q.type === "sql") && (
						<div className='space-y-2'>
							{q.testCasesVisible && (
								<p className='text-xs text-muted-foreground'>
									Sample:{" "}
									<span className='font-mono font-semibold'>
										{q.testCasesVisible[0].input} →{" "}
										{q.testCasesVisible[0].expected}
									</span>
									{q.hiddenCount ?
										` · ${q.hiddenCount} hidden test cases`
										: null}
								</p>
							)}
							<CodeEditor
								value={(displayedAnswer as string) ?? q.starterCode ?? ""}
								onChange={(val) => setAnswer(val)}
								language={q.type}
								placeholder='Write your solution here...'
								readOnly={isExamTimeUp || submitting || roundSubmitting}
							/>
							<p className='text-xs text-muted-foreground flex items-center gap-1.5 font-semibold'>
								<Terminal className='w-3 h-3 text-slate-400' />
								Manual review — code is not auto-executed
							</p>
						</div>
					)}

					{q.type === "subjective" && (
						<Textarea
							placeholder='Type your answer here…'
							value={(displayedAnswer as string) || ""}
							onChange={(e) => setAnswer(e.target.value)}
							rows={6}
							disabled={isExamTimeUp || submitting || roundSubmitting}
							className={cn(isExamTimeUp || submitting || roundSubmitting ? "cursor-not-allowed opacity-60" : "", "text-xs font-semibold")}
						/>
					)}
				</div>

				<Separator />

				<div className='flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 px-4 py-2.5 sm:px-6'>
					{current > 0 ?
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-8 px-2.5 text-xs cursor-pointer w-full sm:w-auto font-bold border-slate-200'
							onClick={() => {
								saveCurrentAnswer();
								setCurrent((c) => c - 1);
							}}
							disabled={submitting || roundSubmitting}>
							<ChevronLeft className='w-4 h-4 mr-1.5' /> Previous
						</Button>
						: <div />}
					{current < activeQuestions.length - 1 ?
						<Button
							variant='outline'
							size='sm'
							className='h-8 px-2.5 text-xs cursor-pointer w-full sm:w-auto font-bold border-slate-200'
							onClick={saveAndNext}
							disabled={isExamTimeUp || submitting || roundSubmitting}>
							Save and next <ChevronRight className='w-4 h-4 ml-1.5' />
						</Button>
						: <Button
							size='sm'
							className='h-8 px-2.5 text-xs cursor-pointer w-full sm:w-auto font-bold'
							onClick={() => {
								saveCurrentAnswer();
								setIsConfirmingSubmit(true);
							}}
							disabled={isExamTimeUp || roundSubmitting || submitting}>
							<Send className='w-3.5 h-3.5 mr-1.5' />
							{roundSubmitting ?
								"Submitting…"
								: roundIdx < ROUNDS.length - 1 ?
									`Submit Round ${activeRound.id} & Continue`
									: "Submit Test"}
						</Button>
					}
				</div>
			</CardContent>
		</Card>
	);
}
