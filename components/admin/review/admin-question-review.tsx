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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodingGradeToggle } from "@/components/admin/review/coding-grade-toggle";
import { CalculateResultsButton } from "@/components/admin/review/calculate-results-button";
import { EvaluationBreakdown } from "@/components/admin/review/evaluation-breakdown";
import { cn } from "@/lib/utils";
import type { AdminGrade, Answer, CandidateResult, Question } from "@/types";
import { PageContainer } from "@/components/ui/layout-primitives";

type Item = { answer: Answer; question: Question | null };

function statusFor(
	item: Item,
): "correct" | "incorrect" | "partial" | "needsGrading" | "ungraded" {
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
	onBack,
	onCalculate,
}: {
	result: CandidateResult;
	items: Item[];
	onBack?: () => void;
	onCalculate?: (updatedResult: CandidateResult) => void;
}) {
	const [answers, setAnswers] = useState(() =>
		items.map((item) => item.answer),
	);

	function handleGradeChange(questionId: string, grade: AdminGrade) {
		setAnswers((currentAnswers) =>
			currentAnswers.map((currentAnswer) =>
				currentAnswer.questionId === questionId ?
					{ ...currentAnswer, adminGrade: grade }
				:	currentAnswer,
			),
		);
	}

	// Filter subsets
	const mcqItems = items.map((it, idx) => ({ ...it, answer: answers[idx], globalIndex: idx })).filter(
		(it) =>
			it.answer.questionType === "mcq_single" ||
			it.answer.questionType === "mcq_multi" ||
			it.answer.questionType === "output_prediction"
	);

	const subjectiveItems = items.map((it, idx) => ({ ...it, answer: answers[idx], globalIndex: idx })).filter(
		(it) => it.answer.questionType === "subjective"
	);

	const codingItems = items.map((it, idx) => ({ ...it, answer: answers[idx], globalIndex: idx })).filter(
		(it) =>
			it.answer.questionType === "coding" ||
			it.answer.questionType === "sql"
	);

	// Active tab state
	const [activeTab, setActiveTab] = useState<"mcq" | "subjective" | "coding">(
		() => {
			if (mcqItems.length > 0) return "mcq";
			if (subjectiveItems.length > 0) return "subjective";
			return "coding";
		}
	);

	// Select index state inside the active filtered subset
	const [selectedIndex, setSelectedIndex] = useState(0);

	const currentItems =
		activeTab === "mcq" ? mcqItems
		: activeTab === "subjective" ? subjectiveItems
		: codingItems;

	const item = currentItems[selectedIndex];

	const theme =
		activeTab === "mcq" ?
			{
				bg: "bg-violet-600",
				border: "border-violet-200",
				accentBorder: "border-violet-500",
				text: "text-violet-650",
				badge: "bg-violet-50 text-violet-850 border-violet-200",
				activeGrid: "bg-violet-600 text-white border-violet-600",
				hoverBorder: "hover:border-violet-400",
			}
		: activeTab === "subjective" ?
			{
				bg: "bg-sky-500",
				border: "border-sky-200",
				accentBorder: "border-sky-400",
				text: "text-sky-655",
				badge: "bg-sky-50 text-sky-850 border-sky-150",
				activeGrid: "bg-sky-500 text-white border-sky-500",
				hoverBorder: "hover:border-sky-350",
			}
		: {
				bg: "bg-orange-500",
				border: "border-orange-200",
				accentBorder: "border-orange-400",
				text: "text-orange-655",
				badge: "bg-orange-50 text-orange-850 border-orange-150",
				activeGrid: "bg-orange-500 text-white border-orange-500",
				hoverBorder: "hover:border-orange-350",
			};

	const isMcqSingle =
		item &&
		(item.answer.questionType === "mcq_single" ||
			item.answer.questionType === "output_prediction");
	const isMcqMulti = item && item.answer.questionType === "mcq_multi";
	const isCode =
		item &&
		(item.answer.questionType === "coding" ||
			item.answer.questionType === "sql");
	const isSubjective = item && item.answer.questionType === "subjective";

	const selectedIds =
		isMcqMulti && item ?
			((Array.isArray(item.answer.answerValue) ?
				item.answer.answerValue
			:	[]) as string[])
		:	[];
	const selectedId =
		isMcqSingle && item ?
			typeof item.answer.answerValue === "string" ?
				item.answer.answerValue
			:	""
		:	"";

	return (
		<PageContainer className="py-8 space-y-6">
			{/* Back Link */}
			<div>
				{onBack ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
						className="-ml-2 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs"
					>
						<ArrowLeft className="h-4 w-4 mr-1.5" />
						Back to candidate details
					</Button>
				) : (
					<Link href="/admin">
						<Button
							variant="ghost"
							size="sm"
							className="-ml-2 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs"
						>
							<ArrowLeft className="h-4 w-4 mr-1.5" />
							Back to all results
						</Button>
					</Link>
				)}
			</div>

			<EvaluationBreakdown result={result} />

			{/* Round Tab Card header */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs overflow-hidden relative">
				<div className={cn("absolute top-0 left-0 right-0 h-1.5 transition-all duration-300", theme.bg)} />
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Assignment Submission Review</h1>
						<p className="text-xs text-slate-500 mt-1">Review and grade candidate answers per evaluation rounds.</p>
					</div>
					
					{/* Horizontal tab scrollable array */}
					<div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
						<button
							onClick={() => {
								setActiveTab("mcq");
								setSelectedIndex(0);
							}}
							className={cn(
								"px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer",
								activeTab === "mcq" 
									? "border-violet-600 bg-violet-50 text-violet-750 font-extrabold shadow-xs"
									: "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
							)}
						>
							ROUND 1 · MCQ ({mcqItems.length})
						</button>
						<button
							onClick={() => {
								setActiveTab("subjective");
								setSelectedIndex(0);
							}}
							className={cn(
								"px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer",
								activeTab === "subjective" 
									? "border-sky-500 bg-sky-50 text-sky-750 font-extrabold shadow-xs"
									: "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
							)}
						>
							ROUND 2 · Subjective ({subjectiveItems.length})
						</button>
						<button
							onClick={() => {
								setActiveTab("coding");
								setSelectedIndex(0);
							}}
							className={cn(
								"px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer",
								activeTab === "coding" 
									? "border-orange-500 bg-orange-50 text-orange-750 font-extrabold shadow-xs"
									: "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
							)}
						>
							ROUND 3 · Coding ({codingItems.length})
						</button>
					</div>
				</div>
			</div>

			{/* Main Grid Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
				{/* Column 1: Left Navigator Grid Matrix */}
				<div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
					<div className={cn("absolute top-0 left-0 right-0 h-1 transition-all duration-300", theme.bg)} />
					
					<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
						{currentItems.filter((i) => i.answer.answerValue && i.answer.answerValue.length !== 0).length} / {currentItems.length} answered
					</p>

					{currentItems.length > 0 ? (
						<>
							<div className="grid grid-cols-4 gap-2 mb-4">
								{currentItems.map((it, idx) => {
									const status = statusFor(it);
									return (
										<button
											key={it.answer.questionId}
											onClick={() => setSelectedIndex(idx)}
											className={cn(
												"h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all cursor-pointer",
												idx === selectedIndex && theme.activeGrid,
												idx !== selectedIndex && status === "correct" && "bg-emerald-50 border-emerald-250 text-emerald-800",
												idx !== selectedIndex && status === "incorrect" && "bg-red-50 border-red-250 text-red-800",
												idx !== selectedIndex && status === "needsGrading" && "bg-amber-50 border-amber-250 text-amber-800 animate-pulse",
												idx !== selectedIndex && status === "partial" && "bg-blue-50 border-blue-250 text-blue-800",
												idx !== selectedIndex && status === "ungraded" && "bg-slate-50 border-slate-200 text-slate-500",
											)}
										>
											{idx + 1}
										</button>
									);
								})}
							</div>

							<div className="space-y-2 text-[11px] font-bold text-slate-550 border-t border-slate-100 pt-4">
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
									Correct
								</div>
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-red-500" />
									Incorrect
								</div>
								{activeTab !== "mcq" && (
									<>
										<div className="flex items-center gap-2">
											<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
											Partially Correct
										</div>
										<div className="flex items-center gap-2">
											<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
											Needs Grading
										</div>
									</>
								)}
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-slate-250" />
									Not scored
								</div>
							</div>
						</>
					) : (
						<p className="text-xs text-slate-400 italic">No questions in this section.</p>
					)}
				</div>

				{/* Column 2-4: Main Question review panel */}
				<div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden relative flex flex-col justify-between min-h-[460px]">
					<div className={cn("absolute top-0 left-0 right-0 h-1 transition-all duration-300", theme.bg)} />

					{currentItems.length > 0 && item ? (
						<>
							{/* Header Row */}
							<div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-wrap gap-2">
								<div className="flex items-center gap-3">
									<Badge className={cn("border tracking-wider text-[10px] uppercase font-bold", theme.badge)}>
										{item.answer.questionTopic || "General"}
									</Badge>
									<span className="text-xs font-bold text-slate-500">
										Question {selectedIndex + 1} of {currentItems.length}
										{item.question ? ` · ${item.question.marks} marks` : ""}
									</span>
								</div>

								{/* Header grade tags */}
								<div className="flex items-center gap-2">
									{activeTab === "mcq" && (
										item.answer.isCorrect ? (
											<span className="flex items-center gap-1 text-xs font-extrabold uppercase text-emerald-600">
												<CheckCircle2 className="w-4 h-4" /> Correct
											</span>
										) : (
											<span className="flex items-center gap-1 text-xs font-extrabold uppercase text-red-500">
												<XCircle className="w-4 h-4" /> Incorrect
											</span>
										)
									)}

									{activeTab !== "mcq" && (
										<>
											{item.answer.adminGrade === "correct" && (
												<span className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-600">
													<CheckCircle2 className="w-4 h-4" /> Correct
												</span>
											)}
											{item.answer.adminGrade === "partial" && (
												<span className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-blue-600">
													<Circle className="w-4 h-4 fill-blue-105" /> Partially Correct
												</span>
											)}
											{item.answer.adminGrade === "incorrect" && (
												<span className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-red-500">
													<XCircle className="w-4 h-4" /> Incorrect
												</span>
											)}
											{!item.answer.adminGrade && (
												<span className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-amber-500">
													<AlertTriangle className="w-4 h-4" /> Needs Grading
												</span>
											)}
										</>
									)}
								</div>
							</div>

							{/* Question Stem Content */}
							<div className="p-6 space-y-6 flex-1">
								<div className="space-y-4">
									<p className="text-sm font-semibold text-slate-800 leading-relaxed">
										{item.question?.stem ?? "(Original question text unavailable — showing recorded answer only.)"}
									</p>

									{item.question?.code && (
										<pre className="text-xs bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-x-auto font-mono text-slate-700">
											{item.question.code}
										</pre>
									)}
								</div>

								{/* Section-Specific Workspaces */}
								{/* MCQ layout */}
								{activeTab === "mcq" && item.question?.options && (
									<div className="space-y-2">
										{item.question.options.map((opt: { id: string; text: string }) => {
											const isMcqMulti = item.answer.questionType === "mcq_multi";
											
											// Candidate selection check
											let isCandidatePick = false;
											if (isMcqMulti) {
												isCandidatePick = selectedIds.includes(opt.id);
											} else {
												isCandidatePick = opt.id === selectedId;
											}

											// Correct option check
											let isCorrectOption = false;
											if (isMcqMulti) {
												isCorrectOption = (item.question?.correctOptionIds ?? []).includes(opt.id);
											} else {
												isCorrectOption = opt.id === item.question?.correctOptionId;
											}

											return (
												<div
													key={opt.id}
													className={cn(
														"flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-semibold transition-all",
														isCorrectOption && "border-emerald-250 bg-emerald-50/50 text-emerald-800 shadow-xs",
														isCandidatePick && !isCorrectOption && "border-red-250 bg-red-50/50 text-red-800"
													)}
												>
													<span className="flex items-center gap-2.5">
														<span
															className={cn(
																"w-4 h-4 border shrink-0 flex items-center justify-center bg-white",
																isMcqMulti ? "rounded-md" : "rounded-full",
																isCandidatePick ? "bg-slate-900 border-slate-900" : "border-slate-300"
															)}
														>
															{isCandidatePick && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
														</span>
														{opt.text}
													</span>
													<span className="flex items-center gap-2">
														{isCandidatePick && (
															<Badge variant="outline" className="text-[10px] font-bold border-slate-200">
																Candidate&apos;s Answer
															</Badge>
														)}
														{isCorrectOption && (
															<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[10px]">
																Correct Answer
															</Badge>
														)}
													</span>
												</div>
											);
										})}

										{!selectedId && selectedIds.length === 0 && (
											<p className="text-xs text-slate-400 italic font-medium pt-2">
												Candidate did not submit an answer for this question.
											</p>
										)}
									</div>
								)}

								{/* Subjective Layout */}
								{isSubjective && (
									<div className="space-y-4">
										<div>
											<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
												Candidate&apos;s Response:
											</p>
											<p className="text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-4 whitespace-pre-wrap font-medium overflow-x-auto">
												{(typeof item.answer.answerValue === "string" && item.answer.answerValue.trim())
													? item.answer.answerValue 
													: "(No text response submitted)"}
											</p>
										</div>

										<div className="pt-4 border-t border-slate-100">
											<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
												Evaluation Grade
											</p>
											<div className="rounded-xl border border-sky-100 p-4 bg-sky-50/20 max-w-md">
												<CodingGradeToggle
													key={item.answer.questionId}
													resultId={result.id}
													questionId={item.answer.questionId}
													initialGrade={item.answer.adminGrade}
													disabled={result.totalMarksAwarded !== undefined}
													onGradeChange={(grade: AdminGrade) =>
														handleGradeChange(item.answer.questionId, grade)
													}
												/>
											</div>
										</div>
									</div>
								)}

								{/* Coding Layout */}
								{isCode && (
									<div className="space-y-5">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
											{/* Left: problem explanation */}
											<div className="space-y-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
												<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
													Problem Explanation
												</p>
												<div className="text-xs leading-relaxed font-medium text-slate-650 space-y-2">
													{item.question?.stem ? (
														<p>{item.question.stem}</p>
													) : (
														<p className="italic text-slate-400">Problem description details not loaded.</p>
													)}
												</div>

												{item.question?.testCasesVisible && item.question.testCasesVisible.length > 0 && (
													<div className="pt-3 border-t border-slate-100 space-y-2">
														<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
															Visible Test Cases
														</span>
														{item.question.testCasesVisible.map((tc: { input: string; expected: string }, tcIdx: number) => (
															<div key={tcIdx} className="text-xs font-mono text-slate-600 bg-slate-100/50 border border-slate-200/50 rounded-lg p-2 flex justify-between overflow-x-auto">
																<span>Input: {tc.input}</span>
																<span>Expected: {tc.expected}</span>
															</div>
														))}
													</div>
												)}
											</div>

											{/* Right: mock IDE viewport block */}
											<div className="space-y-3">
												<div className="rounded-xl overflow-hidden border border-orange-200/60 shadow-xs">
													<div className="bg-orange-50 px-4 py-2 border-b border-orange-100 flex items-center justify-between text-[10px] font-bold text-orange-700">
														<span className="tracking-wide uppercase">Mock Editor Viewport</span>
														<span className="font-mono">read-only</span>
													</div>
													<pre className="text-xs bg-[#1E1E1E] text-[#D4D4D4] p-4 overflow-x-auto font-mono whitespace-pre-wrap min-h-[160px] max-h-[300px]">
														{(typeof item.answer.answerValue === "string" && item.answer.answerValue.trim())
															? item.answer.answerValue 
															: "(No code submitted)"}
													</pre>
												</div>

												{item.question?.hiddenCount ? (
													<p className="text-[10px] font-bold text-slate-455 italic">
														* Contains {item.question.hiddenCount} hidden test cases evaluated in the background.
													</p>
												) : null}
											</div>
										</div>

										<div className="pt-4 border-t border-slate-100">
											<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
												Evaluate Grade Status
											</p>
											<div className="rounded-xl border border-orange-100 p-4 bg-orange-50/20 max-w-md">
												<CodingGradeToggle
													key={item.answer.questionId}
													resultId={result.id}
													questionId={item.answer.questionId}
													initialGrade={item.answer.adminGrade}
													disabled={result.totalMarksAwarded !== undefined}
													onGradeChange={(grade: AdminGrade) =>
														handleGradeChange(item.answer.questionId, grade)
													}
												/>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Footer Navigation bar */}
							<div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
								<Button
									variant="ghost"
									size="sm"
									disabled={selectedIndex === 0}
									onClick={() => setSelectedIndex((c) => c - 1)}
									className="h-9 px-4 text-xs font-bold rounded-xl cursor-pointer"
								>
									<ChevronLeft className="w-4 h-4 mr-1.5" /> Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={selectedIndex === currentItems.length - 1}
									onClick={() => setSelectedIndex((c) => c + 1)}
									className="h-9 px-4 text-xs font-bold border-slate-200 rounded-xl cursor-pointer"
								>
									Next <ChevronRight className="w-4 h-4 ml-1.5" />
								</Button>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
							<p className="text-sm font-semibold text-slate-400 italic">No questions found in this assessment section.</p>
						</div>
					)}
				</div>
			</div>

			{/* Sticky calculations footer bar */}
			<div className="sticky bottom-0 bg-white border border-slate-200 shadow-md px-6 py-4 z-40 w-full flex items-center justify-between flex-wrap gap-3 rounded-2xl mt-8">
				<div className="text-sm font-bold text-slate-655">
					{result.totalMarksAwarded !== undefined ? (
						<span>
							Total Marks Awarded:{" "}
							<span className="text-slate-900 font-extrabold text-base ml-1">
								{result.totalMarksAwarded}/{result.totalMarksPossible}
							</span>
						</span>
					) : (
						<span className="text-xs text-slate-450 italic">
							Grade all coding and subjective questions, then calculate the final score.
						</span>
					)}
				</div>
				<CalculateResultsButton
					resultId={result.id}
					tabSwitches={result.tabSwitches}
					disabled={result.totalMarksAwarded !== undefined}
					onCalculate={onCalculate}
				/>
			</div>
		</PageContainer>
	);
}
