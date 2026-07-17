"use client";

import { useState } from "react";
import Link from "next/link";
import {
	ChevronLeft,
	ChevronRight,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	ArrowLeft,
	Circle,
	Clock,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodingGradeToggle } from "@/components/candidates/coding-grade-toggle";
import { CalculateResultsButton } from "@/components/candidates/calculate-results-button";
import { EvaluationBreakdown } from "@/components/admin/evaluation-breakdown";
import { cn } from "@/lib/utils";
import type { AdminGrade, Answer, CandidateResult, Question } from "@/types";

type Item = { answer: Answer; question: Question | null };

function formatDuration(seconds: number) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s}s`;
}

// Status used to color each numbered chip in the left navigator
function statusFor(
	item: Item,
):
	| "correct"
	| "incorrect"
	| "partial"
	| "needsGrading"
	| "ungraded" {
	const { answer } = item;
	const isMcq =
		answer.questionType === "mcq_single" ||
		answer.questionType === "mcq_multi" ||
		answer.questionType === "output_prediction";

	if (isMcq) return answer.isCorrect ? "correct" : "incorrect";
	if (
		answer.questionType === "coding" ||
		answer.questionType === "sql" ||
		answer.questionType === "subjective"
	) {
		if (!answer.adminGrade) return "needsGrading";
		return answer.adminGrade;
	}
	return "ungraded";
}

export function AdminQuestionReview({
	result,
	items,
}: {
	result: CandidateResult;
	items: Item[];
}) {
	const [current, setCurrent] = useState(0);
	const [answers, setAnswers] = useState(() => items.map((item) => item.answer));
	const item = { ...items[current], answer: answers[current] };
	const { answer, question } = item;

	function handleGradeChange(questionId: string, grade: AdminGrade) {
		setAnswers((currentAnswers) =>
			currentAnswers.map((currentAnswer) =>
				currentAnswer.questionId === questionId ?
					{ ...currentAnswer, adminGrade: grade }
				: currentAnswer,
			),
		);
	}

	const isMcqSingle =
		answer.questionType === "mcq_single" ||
		answer.questionType === "output_prediction";
	const isMcqMulti = answer.questionType === "mcq_multi";
	const isCode =
		answer.questionType === "coding" || answer.questionType === "sql";
	const isSubjective = answer.questionType === "subjective";
	const isManuallyGraded = isCode || isSubjective;

	const selectedIds =
		isMcqMulti ?
			((Array.isArray(answer.answerValue) ?
				answer.answerValue
			:	[]) as string[])
		:	[];
	const selectedId =
		isMcqSingle ?
			typeof answer.answerValue === "string" ?
				answer.answerValue
			:	""
		:	"";

	return (
		<>
			<SiteHeader />
			<main className='max-w-6xl mx-auto px-6 py-8 space-y-4'>
				<Link href='/admin'>
					<Button
						variant='ghost'
						size='sm'
						className='-ml-2'>
						<ArrowLeft className='h-4 w-4 mr-1.5' />
						Back to all results
					</Button>
				</Link>

				{/* ---------- candidate header ---------- */}
				<div className='rounded-lg border bg-card p-4 flex items-center justify-between flex-wrap gap-3 capitalize'>
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
							{result.candidate.name
								.split(" ")
								.map((n) => n[0])
								.slice(0, 2)
								.join("")
								.toUpperCase()}
						</div>
						<div className='leading-tight'>
							<div className='text-sm font-medium'>{result.candidate.name}</div>
							<div className='text-xs text-muted-foreground'>
								{result.candidate.role} · {result.candidate.experience} yrs
							</div>
						</div>
					</div>

					<div className='flex items-center gap-2 flex-wrap'>
						{result.totalMarksAwarded !== undefined && (
							<Badge className='bg-primary/10 text-primary border-primary/20'>
								Total: {result.totalMarksAwarded}/{result.totalMarksPossible}
							</Badge>
						)}
						{result.tabSwitches > 0 && (
							<Badge variant='destructive'>
								<AlertTriangle className='w-3 h-3 mr-1' />
								{result.tabSwitches} tab switches
							</Badge>
						)}
						<span className='flex items-center gap-1 text-xs text-muted-foreground'>
							<Clock className='w-3 h-3' />
							{formatDuration(result.secondsUsed)} used
						</span>
					</div>
				</div>

				<EvaluationBreakdown result={result} />

				<div className='grid grid-cols-[220px_1fr] gap-4 items-start'>
					{/* ---------- question navigator ---------- */}
					<div className='rounded-lg border bg-card p-4'>
						<p className='text-xs text-muted-foreground mb-3'>
							{
								items.filter(
									(i) =>
										i.answer.answerValue && i.answer.answerValue.length !== 0,
								).length
							}{" "}
							/ {items.length} answered
						</p>
						<div className='grid grid-cols-4 gap-2 mb-4'>
							{items.map((it, idx) => {
								const status = statusFor({ ...it, answer: answers[idx] });
								return (
									<button
										key={it.answer.questionId}
										onClick={() => setCurrent(idx)}
										className={cn(
											"h-9 rounded-md flex items-center justify-center text-xs border transition-colors",
											idx === current &&
												"bg-primary text-primary-foreground border-primary",
											idx !== current &&
												status === "correct" &&
												"bg-emerald-50 border-emerald-300 text-emerald-700",
											idx !== current &&
												status === "incorrect" &&
												"bg-red-50 border-red-300 text-red-700",
											idx !== current &&
												status === "needsGrading" &&
												"bg-amber-50 border-amber-300 text-amber-700",
											idx !== current &&
												status === "partial" &&
												"bg-blue-50 border-blue-300 text-blue-700",
											idx !== current &&
												status === "ungraded" &&
												"bg-muted border-transparent text-muted-foreground",
										)}>
										{idx + 1}
									</button>
								);
							})}
						</div>
						<div className='space-y-2 text-xs text-muted-foreground border-t pt-3'>
							<div className='flex items-center gap-2'>
								<Circle className='w-2.5 h-2.5 text-emerald-600' /> Correct
							</div>
							<div className='flex items-center gap-2'>
								<Circle className='w-2.5 h-2.5 text-red-500' /> Incorrect
							</div>
							<div className='flex items-center gap-2'>
								<Circle className='w-2.5 h-2.5 text-blue-500' /> Partially
								correct
							</div>
							<div className='flex items-center gap-2'>
								<Circle className='w-2.5 h-2.5 text-amber-500' /> Needs grading
							</div>
							<div className='flex items-center gap-2'>
								<Circle className='w-2.5 h-2.5' /> Not auto-scored
							</div>
						</div>
					</div>

					{/* ---------- main question panel ---------- */}
					<div className='rounded-lg border bg-card'>
						<div className='flex items-center justify-between px-6 py-3 border-b flex-wrap gap-2'>
							<div className='flex items-center gap-3'>
								<Badge variant='secondary'>{answer.questionTopic}</Badge>
								<span className='text-xs text-muted-foreground'>
									Q{current + 1} of {items.length}
									{question ? ` · ${question.marks} marks` : ""}
								</span>
							</div>
							{isMcqSingle &&
								(answer.isCorrect ?
									<span className='flex items-center gap-1 text-xs text-emerald-600'>
										<CheckCircle2 className='w-3.5 h-3.5' /> Correct
									</span>
								:	<span className='flex items-center gap-1 text-xs text-red-500'>
										<XCircle className='w-3.5 h-3.5' /> Incorrect
									</span>)}
							{isManuallyGraded && answer.adminGrade === "correct" && (
								<span className='flex items-center gap-1 text-xs text-emerald-600'>
									<CheckCircle2 className='w-3.5 h-3.5' /> Correct
								</span>
							)}
							{isManuallyGraded && answer.adminGrade === "partial" && (
								<span className='flex items-center gap-1 text-xs text-blue-600'>
									<Circle className='w-3.5 h-3.5 fill-blue-100' /> Partially Correct
								</span>
							)}
							{isManuallyGraded && answer.adminGrade === "incorrect" && (
								<span className='flex items-center gap-1 text-xs text-red-500'>
									<XCircle className='w-3.5 h-3.5' /> Incorrect
								</span>
							)}
						</div>

						<div className='px-6 py-5 space-y-4'>
							<p className='text-sm leading-relaxed font-medium'>
								{question?.stem ??
									"(Original question text unavailable — showing recorded answer only.)"}
							</p>

							{question?.code && (
								<pre className='text-xs bg-muted border rounded-md p-4 overflow-x-auto font-mono'>
									{question.code}
								</pre>
							)}

							{/* ---------- single-answer MCQ / output prediction ---------- */}
							{isMcqSingle && question?.options && (
								<div className='space-y-2'>
									{question.options.map((opt) => {
										const isCandidatePick = opt.id === selectedId;
										const isCorrectOption = opt.id === question.correctOptionId;
										return (
											<div
												key={opt.id}
												className={cn(
													"flex items-center justify-between gap-3 px-4 py-3 rounded-md border text-sm",
													isCorrectOption && "border-emerald-300 bg-emerald-50",
													isCandidatePick &&
														!isCorrectOption &&
														"border-red-300 bg-red-50",
												)}>
												<span className='flex items-center gap-2'>
													<span
														className={cn(
															"w-3.5 h-3.5 rounded-full border shrink-0",
															isCandidatePick ?
																"bg-slate-900 border-slate-900"
															:	"border-slate-300",
														)}
													/>
													{opt.text}
												</span>
												<span className='flex items-center gap-2 text-xs'>
													{isCandidatePick && (
														<Badge variant='outline'>
															Candidate&apos;s answer
														</Badge>
													)}
													{isCorrectOption && (
														<Badge className='bg-emerald-100 text-emerald-700 border-emerald-200'>
															Correct answer
														</Badge>
													)}
												</span>
											</div>
										);
									})}
									{!selectedId && (
										<p className='text-xs text-muted-foreground'>
											Candidate did not answer this question.
										</p>
									)}
								</div>
							)}

							{/* ---------- multi-answer MCQ ---------- */}
							{isMcqMulti && question?.options && (
								<div className='space-y-2'>
									{question.options.map((opt) => {
										const isCandidatePick = selectedIds.includes(opt.id);
										const isCorrectOption = (
											question.correctOptionIds ?? []
										).includes(opt.id);
										return (
											<div
												key={opt.id}
												className={cn(
													"flex items-center justify-between gap-3 px-4 py-3 rounded-md border text-sm",
													isCorrectOption && "border-emerald-300 bg-emerald-50",
													isCandidatePick &&
														!isCorrectOption &&
														"border-red-300 bg-red-50",
												)}>
												<span className='flex items-center gap-2'>
													<span
														className={cn(
															"w-3.5 h-3.5 rounded-sm border shrink-0",
															isCandidatePick ?
																"bg-slate-900 border-slate-900"
															:	"border-slate-300",
														)}
													/>
													{opt.text}
												</span>
												<span className='flex items-center gap-2 text-xs'>
													{isCandidatePick && (
														<Badge variant='outline'>Selected</Badge>
													)}
													{isCorrectOption && (
														<Badge className='bg-emerald-100 text-emerald-700 border-emerald-200'>
															Correct
														</Badge>
													)}
												</span>
											</div>
										);
									})}
								</div>
							)}

							{/* ---------- coding / sql ---------- */}
							{isCode && (
								<div className='space-y-3'>
									<div>
										<p className='text-xs text-muted-foreground mb-1.5'>
											Candidate&apos;s submission:
										</p>
										<pre className='text-xs bg-[#1e1e1e] text-[#d4d4d4] border rounded-md p-4 overflow-x-auto font-mono whitespace-pre-wrap'>
											{(
												typeof answer.answerValue === "string" &&
												answer.answerValue.trim()
											) ?
												answer.answerValue
											:	"(No code submitted)"}
										</pre>
									</div>
									{question?.testCasesVisible && (
										<p className='text-xs text-muted-foreground'>
											Sample test case:{" "}
											<span className='font-mono'>
												{question.testCasesVisible[0].input} →{" "}
												{question.testCasesVisible[0].expected}
											</span>
											{question.hiddenCount ?
												` · ${question.hiddenCount} hidden test cases`
											:	null}
										</p>
									)}
									<CodingGradeToggle
										key={answer.questionId}
										resultId={result.id}
										questionId={answer.questionId}
										initialGrade={answer.adminGrade}
										onGradeChange={(grade) =>
											handleGradeChange(answer.questionId, grade)
										}
									/>
								</div>
							)}

							{/* ---------- subjective ---------- */}
							{isSubjective && (
								<div className='space-y-3'>
									<div>
										<p className='text-xs text-muted-foreground mb-1.5'>
											Candidate&apos;s answer:
										</p>

										<p className='text-sm border rounded-md p-4 bg-muted/40 whitespace-pre-wrap'>
											{(
												typeof answer.answerValue === "string" &&
												answer.answerValue.trim()
											) ?
												answer.answerValue
											:	"(No answer given)"}
										</p>
									</div>

									<CodingGradeToggle
										key={answer.questionId}
										resultId={result.id}
										questionId={answer.questionId}
										initialGrade={answer.adminGrade}
										onGradeChange={(grade) =>
											handleGradeChange(answer.questionId, grade)
										}
									/>
								</div>
							)}

							<div className='flex items-center justify-between px-6 py-3 border-t'>
								{" "}
							</div>
							<Button
								variant='ghost'
								size='sm'
								disabled={current === 0}
								onClick={() => setCurrent((c) => c - 1)}>
								<ChevronLeft className='w-4 h-4 mr-1.5' /> Previous
							</Button>
							<Button
								variant='outline'
								size='sm'
								disabled={current === items.length - 1}
								onClick={() => setCurrent((c) => c + 1)}>
								Next <ChevronRight className='w-4 h-4 ml-1.5' />
							</Button>
						</div>
					</div>
				</div>

				{/* ---------- calculate results — always visible, independent of current question ---------- */}
				<div className='rounded-lg border bg-card px-6 py-4 flex items-center justify-between flex-wrap gap-3'>
					<div className='text-sm text-muted-foreground'>
						{result.totalMarksAwarded !== undefined ?
							<span>
								Total marks:{" "}
								<span className='text-foreground font-medium text-base'>
									{result.totalMarksAwarded}/{result.totalMarksPossible}
								</span>
							</span>
						:	<span>
								Grade all coding questions, then calculate the final score.
							</span>
						}
					</div>
					<CalculateResultsButton
						resultId={result.id}
						tabSwitches={result.tabSwitches}
					/>
				</div>

			</main>
		</>
	);
}
