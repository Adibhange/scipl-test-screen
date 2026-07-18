"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
	Clock,
	Flag,
	ChevronLeft,
	ChevronRight,
	CheckCircle2,
	Send,
	Terminal,
	ShieldAlert,
	Save,
	Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Question, AnswerValue, Candidate } from "@/types";
import { CodeEditor } from "@/components/interview/code-editor";
import {
	AssessmentRoundCard,
	type AssessmentRound,
} from "@/components/interview/assessment-round-card";
import { AssessmentStatusBar } from "@/components/interview/assessment-status-bar";

// ── Round config ──────────────────────────────────────────────
const ROUNDS: AssessmentRound[] = [
	{
		id: 1,
		label: "MCQ",
		types: ["mcq_single", "mcq_multi", "output_prediction"],
		limit: 20,
		durationSeconds: 1 * 60,
	},
	{
		id: 2,
		label: "Subjective",
		types: ["subjective"],
		limit: 3,
		durationSeconds: 30 * 60,
	},
	{
		id: 3,
		label: "Coding",
		types: ["coding", "sql"],
		limit: 5,
		durationSeconds: 60 * 60,
	},
];

type Props = {
	candidate: Candidate;
	questions: Question[];
	onSubmit: (payload: {
		answers: Record<string, AnswerValue>;
		flagged: string[];
		tabSwitches: number;
		secondsUsed: number;
	}) => Promise<void>;
	onDone: () => void;
};

const ATTEMPT_STORAGE_KEY = "assessment-attempt";

type SavedAttempt = {
	candidateEmail: string;
	roundIdx: number;
	completedRounds: number[];
	current: number;
	answers: Record<string, AnswerValue>;
	flagged: Record<string, boolean>;
	secondsLeft: number;
	tabSwitches: number;
	hasStarted: boolean;
	showRoundGate: boolean;
	savedAt: number;
};

function getSavedAttempt(candidateEmail: string): SavedAttempt | null {
	if (typeof window === "undefined") return null;
	try {
		const saved = JSON.parse(sessionStorage.getItem(ATTEMPT_STORAGE_KEY) ?? "null") as SavedAttempt | null;
		return saved?.candidateEmail === candidateEmail ? saved : null;
	} catch {
		return null;
	}
}

function formatTime(s: number) {
	const m = Math.floor(s / 60)
		.toString()
		.padStart(2, "0");
	const sec = Math.floor(s % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${sec}`;
}

export function CandidateTestScreen({
	candidate,
	questions,
	onSubmit,
	onDone,
}: Props) {
	const [savedAttempt] = useState(() => getSavedAttempt(candidate.email));
	// Split and shuffle questions into rounds
	const roundQuestions = useMemo(() => {
		return ROUNDS.map((r) => {
			const filtered = questions.filter((q) => r.types.includes(q.type));
			// Basic shuffle
			const shuffled = [...filtered].sort((a, b) => a.id.localeCompare(b.id)); // Deterministic sort by ID
			// We can use a proper shuffle if needed, but for now let's just slice
			// If you want true randomness, use: .sort(() => Math.random() - 0.5)
			return shuffled.slice(0, r.limit);
		});
	}, [questions]);

	const [roundIdx, setRoundIdx] = useState(savedAttempt?.roundIdx ?? 0);
	const [completedRounds, setCompletedRounds] = useState<number[]>(savedAttempt?.completedRounds ?? []);
	const [current, setCurrent] = useState(savedAttempt?.current ?? 0);
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>(savedAttempt?.answers ?? {});
	const [flagged, setFlagged] = useState<Record<string, boolean>>(savedAttempt?.flagged ?? {});
	const [secondsLeft, setSecondsLeft] = useState(() => {
		if (!savedAttempt) return ROUNDS[0].durationSeconds;
		if (savedAttempt.showRoundGate || !savedAttempt.hasStarted) return savedAttempt.secondsLeft;
		return Math.max(0, savedAttempt.secondsLeft - Math.floor((Date.now() - savedAttempt.savedAt) / 1000));
	});
	const [tabSwitches, setTabSwitches] = useState(savedAttempt?.tabSwitches ?? 0);
	const [showWarning, setShowWarning] = useState(false);
	const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
	const [allSubmitted, setAllSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [roundSubmitting, setRoundSubmitting] = useState(false);
	const [hasStarted, setHasStarted] = useState(savedAttempt?.hasStarted ?? false);
	const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
	// Show a "ready for next round" gate between rounds
	const [showRoundGate, setShowRoundGate] = useState(savedAttempt?.showRoundGate ?? false);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const guardRef = useRef<HTMLDivElement>(null);

	const activeRound = ROUNDS[roundIdx];
	const activeQuestions = roundQuestions[roundIdx] ?? [];
	const q = activeQuestions[current];
	const hasQuestions = activeQuestions.length > 0;

	useEffect(() => {
		if (!hasStarted || allSubmitted) return;
		const snapshot: SavedAttempt = {
			candidateEmail: candidate.email,
			roundIdx,
			completedRounds,
			current,
			answers,
			flagged,
			secondsLeft,
			tabSwitches,
			hasStarted,
			showRoundGate,
			savedAt: Date.now(),
		};
		sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(snapshot));
	}, [answers, allSubmitted, candidate.email, completedRounds, current, flagged, hasStarted, roundIdx, secondsLeft, showRoundGate, tabSwitches]);

	const handleSubmitAll = useCallback(async () => {
		setSubmitting(true);
		try {
			const usedSeconds = ROUNDS.reduce((acc, r, i) => {
				if (i < roundIdx) return acc + r.durationSeconds;
				if (i === roundIdx) return acc + (r.durationSeconds - secondsLeft);
				return acc;
			}, 0);
			await onSubmit({
				answers,
				flagged: Object.keys(flagged).filter((id) => flagged[id]),
				tabSwitches,
				secondsUsed: usedSeconds,
			});
			setAllSubmitted(true);
		} finally {
			setSubmitting(false);
		}
	}, [answers, flagged, tabSwitches, roundIdx, secondsLeft, onSubmit]);

	const handleSubmitRound = useCallback(async () => {
		setRoundSubmitting(true);
		setIsConfirmingSubmit(false);
		await new Promise((r) => setTimeout(r, 400));
		setCompletedRounds((prev) => [...new Set([...prev, activeRound.id])]);
		if (roundIdx < ROUNDS.length - 1) {
			setShowRoundGate(true);
		} else {
			await handleSubmitAll();
		}
		setRoundSubmitting(false);
	}, [activeRound.id, roundIdx, handleSubmitAll]);

	function advanceToNextRound() {
		const nextIndex = roundIdx + 1;
		setShowRoundGate(false);
		setSecondsLeft(ROUNDS[nextIndex].durationSeconds);
		setCurrent(0);
		setRoundIdx(nextIndex);
	}

	function startAssessment() {
		sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
		setSecondsLeft(ROUNDS[0].durationSeconds);
		setCurrent(0);
		setHasStarted(true);
	}

	function finishAssessment() {
		sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
		onDone();
	}

	// Countdown — resets per round
	useEffect(() => {
		if (allSubmitted || !hasQuestions || showRoundGate || !hasStarted) return;
		const t = setInterval(() => {
			setSecondsLeft((s) => {
				if (s <= 1) {
					clearInterval(t);
					// Auto-advance or submit on timeout
					if (roundIdx < ROUNDS.length - 1) {
						setCompletedRounds((prev) => [
							...new Set([...prev, activeRound.id]),
						]);
						setShowRoundGate(true);
					} else {
						handleSubmitAll();
					}
					return 0;
				}
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(t);
	}, [
		allSubmitted,
		hasQuestions,
		roundIdx,
		activeRound.id,
		handleSubmitAll,
		hasStarted,
		showRoundGate,
	]);

	// Tab-switch detection
	useEffect(() => {
		const onVisibility = () => {
			if (document.hidden) {
				setTabSwitches((n) => n + 1);
				setShowWarning(true);
			}
		};
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, []);

	// Copy/paste/right-click guard
	useEffect(() => {
		const el = guardRef.current;
		if (!el) return;
		const block = (e: Event) => e.preventDefault();
		el.addEventListener("contextmenu", block);
		el.addEventListener("copy", block);
		el.addEventListener("paste", block);
		return () => {
			el.removeEventListener("contextmenu", block);
			el.removeEventListener("copy", block);
			el.removeEventListener("paste", block);
		};
	}, []);

	const pctLeft = secondsLeft / activeRound.durationSeconds;
	const timerTone =
		pctLeft > 0.5 ? "ok"
		: pctLeft > 0.15 ? "warn"
		: "danger";
	const triggerAutosave = useCallback(() => {
		setSaveState("saving");
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(() => setSaveState("saved"), 600);
	}, []);

	function setAnswer(val: AnswerValue) {
		if (!q) return;
		setAnswers((a) => ({ ...a, [q.id]: val }));
		triggerAutosave();
	}

	function toggleFlag() {
		if (!q) return;
		setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }));
	}

	function statusFor(idx: number) {
		const id = activeQuestions[idx].id;
		if (idx === current) return "current";
		if (flagged[id]) return "flagged";
		if (answers[id] !== undefined) return "answered";
		return "unvisited";
	}

	const answeredCount = activeQuestions.filter(
		(qq) => answers[qq.id] !== undefined,
	).length;
	const progressPercent = (answeredCount / activeQuestions.length) * 100;

	// ── All submitted ──
	if (allSubmitted) {
		const totalAnswered = questions.filter(
			(qq) => answers[qq.id] !== undefined,
		).length;
		return (
			<Card className='min-h-100 flex items-center justify-center border-emerald-100 shadow-sm'>
				<CardContent className='text-center max-w-md px-6 py-10 space-y-6'>
					<div className='w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2'>
						<CheckCircle2
							className='w-10 h-10 text-emerald-600'
							strokeWidth={1.5}
						/>
					</div>
					<div className='space-y-2'>
						<h2 className='text-2xl font-bold tracking-tight'>
							Test Completed!
						</h2>
						<p className='text-muted-foreground'>
							Great job, {candidate.name.split(" ")[0]}! You have successfully
							submitted all rounds of the assessment.
						</p>
					</div>
					<div className='bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2 border'>
						<div className='flex justify-between'>
							<span className='text-muted-foreground'>Total Questions:</span>
							<span className='font-medium'>{questions.length}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-muted-foreground'>Answered:</span>
							<span className='font-medium text-emerald-600'>
								{totalAnswered}
							</span>
						</div>
						<div className='flex justify-between border-t pt-2 mt-2'>
							<span className='text-muted-foreground'>Security Status:</span>
							<span
								className={cn(
									"font-medium",
									tabSwitches > 2 ? "text-amber-600" : "text-emerald-600",
								)}>
								{tabSwitches === 0 ? "Clean" : `${tabSwitches} alerts logged`}
							</span>
						</div>
					</div>
					<Button
						onClick={finishAssessment}
						className='w-full'
						size='lg'>
						Back to Dashboard
					</Button>
				</CardContent>
			</Card>
		);
	}

	// ── Not Started ──
	if (!hasStarted) {
		return (
			<Card className='max-w-2xl mx-auto'>
				<CardContent className='p-8 space-y-8'>
					<div className='space-y-2 text-center'>
						<h1 className='text-3xl font-bold'>Welcome, {candidate.name}</h1>
						<p className='text-muted-foreground'>
							Please review the test structure before starting. Once you start,
							the timer will begin for Round 1.
						</p>
					</div>

					<div className='grid gap-4'>
						{ROUNDS.map((r, i) => (
							<AssessmentRoundCard
								key={r.id}
								round={r}
								questionCount={roundQuestions[i].length}
								index={i}
							/>
						))}
					</div>

					<div className='space-y-4 rounded-lg bg-amber-50 p-4 border border-amber-200'>
						<h4 className='text-sm font-semibold flex items-center gap-2 text-amber-800'>
							<ShieldAlert className='w-4 h-4' /> Important Rules
						</h4>
						<ul className='text-xs text-amber-700 space-y-1.5 list-disc pl-4'>
							<li>Do not switch tabs or windows. All switches are tracked.</li>
							<li>Right-click and copy/paste are disabled.</li>
							<li>
								Rounds are sequential. Once you submit a round, you cannot go
								back.
							</li>
							<li>
								The test will auto-submit when the timer runs out for each
								round.
							</li>
						</ul>
					</div>

					<Button
						onClick={startAssessment}
						className='w-full'
						size='lg'>
						I&apos;m ready, start the test
					</Button>
				</CardContent>
			</Card>
		);
	}

	// ── Round Gate (Transition) ──
	if (showRoundGate) {
		const nextRound = ROUNDS[roundIdx + 1];
		return (
			<Card className='max-w-xl mx-auto'>
				<CardContent className='p-8 text-center space-y-6'>
					<div className='w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2'>
						<CheckCircle2 className='w-8 h-8 text-emerald-600' />
					</div>
					<div className='space-y-2'>
						<h2 className='text-2xl font-bold'>
							Round {activeRound.id} Submitted
						</h2>
						<p className='text-muted-foreground text-sm'>
							You have completed the {activeRound.label} round. Your answers are
							saved and locked.
						</p>
					</div>

					<Separator />

					{nextRound && (
						<div className='space-y-4'>
							<div className='text-sm font-medium'>
								Up Next: Round {nextRound.id}
							</div>
							<div className='p-6 rounded-2xl border bg-primary/5 flex items-center justify-between text-left'>
								<div>
									<div className='font-bold text-lg'>{nextRound.label}</div>
									<div className='text-xs text-muted-foreground'>
										{roundQuestions[roundIdx + 1].length} Questions ·{" "}
										{nextRound.durationSeconds / 60} Minutes
									</div>
								</div>
								<div className='w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center'>
									<ChevronRight className='w-6 h-6 text-primary' />
								</div>
							</div>
							<Button
								onClick={advanceToNextRound}
								className='w-full'
								size='lg'>
								Start Round {nextRound.id}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	// ── No questions in current round ──
	if (!hasQuestions || !q) {
		return (
			<Card className='min-h-100 flex items-center justify-center'>
				<CardContent className='text-center max-w-md px-6 py-10 space-y-4'>
					<p className='text-sm text-muted-foreground'>
						No questions available for {activeRound.label} round.
					</p>
					{roundIdx < ROUNDS.length - 1 ?
						<Button onClick={advanceToNextRound}>
							Next Round
						</Button>
					:	<Button
							onClick={handleSubmitAll}
							disabled={submitting}>
							{submitting ? "Submitting…" : "Submit test"}
						</Button>
					}
				</CardContent>
			</Card>
		);
	}

	// ── Main UI ──
	return (
		<div
			ref={guardRef}
			className='mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl select-none flex-col gap-4 capitalize'>
			{/* Header */}
			<Card className='overflow-hidden border-slate-200 shadow-sm'>
				<CardContent className='p-4 sm:p-5'>
					<div className='flex items-center justify-between gap-4'>
					<div className='flex min-w-0 items-center gap-3'>
						<div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary'>
							{candidate.name
								.split(" ")
								.map((n) => n[0])
								.join("")
								.slice(0, 2)
								.toUpperCase()}
						</div>
						<div className='min-w-0 leading-tight'>
							<div className='text-sm font-medium'>{candidate.name}</div>
							<div className='truncate text-xs text-muted-foreground'>
								{candidate.role} · {candidate.experience} yrs
							</div>
						</div>
					</div>

					<div className='flex shrink-0 items-center gap-4'>
						<div
							className={cn(
								"flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-lg font-mono font-bold shadow-sm transition-all",
								timerTone === "danger" ?
									"text-red-600 border-red-200 bg-red-50 animate-pulse"
								: timerTone === "warn" ?
									"text-amber-600 border-amber-200 bg-amber-50"
								:	"text-primary border-primary/20 bg-primary/5",
							)}>
							<Clock
								className={cn(
									"w-5 h-5",
									timerTone === "danger" && "animate-spin-slow",
								)}
							/>
							{formatTime(secondsLeft)}
						</div>
					</div>
					</div>
					<div className='mt-4'>
						<AssessmentStatusBar
							rounds={ROUNDS}
							activeIndex={roundIdx}
							completedRounds={completedRounds}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Tab-switch warning */}
			{showWarning && (
				<Alert
					variant='destructive'
					className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<ShieldAlert className='w-4 h-4' />
						<AlertDescription>
							Tab switch detected ({tabSwitches}). This has been logged against
							your attempt.
						</AlertDescription>
					</div>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setShowWarning(false)}>
						Dismiss
					</Button>
				</Alert>
			)}

			<div className='grid flex-1 items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]'>
				{/* Navigator */}
				<div className='space-y-4'>
					<Card className='overflow-hidden'>
						<div className='h-1 bg-muted'>
							<div
								className='h-full bg-primary transition-all duration-300'
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
								<div className='w-10 h-10 rounded-full border-2 border-primary/20 flex items-center justify-center'>
									<span className='text-[10px] font-bold'>
										{Math.round(progressPercent)}%
									</span>
								</div>
							</div>

							<div className='grid grid-cols-5 gap-1.5 mb-4'>
								{activeQuestions.map((qq, idx) => {
									const s = statusFor(idx);
									return (
										<button
											key={qq.id}
											onClick={() => setCurrent(idx)}
											className={cn(
												"aspect-square rounded-md flex items-center justify-center text-[11px] font-medium border transition-all",
												s === "current" &&
													"bg-primary text-primary-foreground border-primary shadow-sm scale-105",
												s === "flagged" &&
													"bg-amber-100 border-amber-300 text-amber-800",
												s === "answered" &&
													"bg-emerald-100 border-emerald-300 text-emerald-800",
												s === "unvisited" &&
													"bg-muted/50 border-transparent text-muted-foreground hover:bg-muted",
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
									<div className='flex items-center gap-2 text-emerald-700'>
										<div className='w-2 h-2 rounded-full bg-emerald-500' />{" "}
										Answered
									</div>
								</div>
								<div className='flex items-center gap-2 text-amber-700'>
									<div className='w-2 h-2 rounded-full bg-amber-500' /> Flagged
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Completed rounds (locked) */}
					{completedRounds.length > 0 && (
						<Card className='bg-muted/30'>
							<CardContent className='p-4 space-y-2'>
								<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2'>
									Completed Rounds
								</p>
								{completedRounds.map((rid) => {
									const r = ROUNDS.find((x) => x.id === rid)!;
									return (
										<div
											key={rid}
											className='flex items-center justify-between text-xs text-muted-foreground'>
											<div className='flex items-center gap-2'>
												<Lock className='w-3 h-3' />
												<span>{r.label}</span>
											</div>
											<CheckCircle2 className='w-3 h-3 text-emerald-500' />
										</div>
									);
								})}
							</CardContent>
						</Card>
					)}
				</div>

				{/* Question panel */}
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
							</div>
							<div className='flex items-center gap-3'>
								<span className='flex items-center gap-1 text-xs text-muted-foreground'>
									<Save className='w-3 h-3' />
									{saveState === "saving" ? "Saving…" : "Saved"}
								</span>
								<Button
									variant={flagged[q.id] ? "secondary" : "outline"}
									size='sm'
									onClick={toggleFlag}
									className={flagged[q.id] ? "text-amber-700" : ""}>
									<Flag className='w-3.5 h-3.5 mr-1.5' />
									{flagged[q.id] ? "Flagged" : "Flag for review"}
								</Button>
							</div>
						</div>

						<div className='px-6 py-5 space-y-4'>
							<p className='text-sm leading-relaxed font-bold'>{q.stem}</p>

							{q.code && (
								<pre className='text-xs bg-muted border rounded-md p-4 overflow-x-auto font-mono'>
									{q.code}
								</pre>
							)}

							{(q.type === "mcq_single" || q.type === "output_prediction") &&
								q.options && (
									<RadioGroup
										value={(answers[q.id] as string) ?? ""}
										onValueChange={(val) => setAnswer(val)}
										className='grid gap-3'>
										{q.options.map((opt, i) => (
											<div
												key={opt.id}
												onClick={() => setAnswer(opt.id)}
												className={cn(
													"flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all cursor-pointer group",
													answers[q.id] === opt.id ?
														"border-primary bg-primary/5 ring-2 ring-primary/10 shadow-sm"
													:	"hover:bg-muted/50 border-transparent bg-muted/20",
												)}>
												<div
													className={cn(
														"w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
														answers[q.id] === opt.id ?
															"border-primary bg-primary text-primary-foreground"
														:	"border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/50",
													)}>
													{String.fromCharCode(65 + i)}
												</div>
												<RadioGroupItem
													value={opt.id}
													id={`${q.id}-${opt.id}`}
													className='sr-only'
												/>
												<Label
													htmlFor={`${q.id}-${opt.id}`}
													className='flex-1 font-medium cursor-pointer text-sm leading-snug'>
													{opt.text}
												</Label>
												{answers[q.id] === opt.id && (
													<CheckCircle2 className='w-4 h-4 text-primary animate-in zoom-in-50' />
												)}
											</div>
										))}
									</RadioGroup>
								)}

							{q.type === "mcq_multi" && q.options && (
								<div className='grid gap-3'>
									{q.options.map((opt, i) => {
										const cur = (answers[q.id] as string[]) || [];
										const selected = cur.includes(opt.id);
										const toggle = () => {
											const next =
												selected ?
													cur.filter((c) => c !== opt.id)
												:	[...cur, opt.id];
											setAnswer(next);
										};
										return (
											<div
												key={opt.id}
												onClick={toggle}
												className={cn(
													"flex items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all cursor-pointer group",
													selected ?
														"border-primary bg-primary/5 ring-2 ring-primary/10 shadow-sm"
													:	"hover:bg-muted/50 border-transparent bg-muted/20",
												)}>
												<div
													className={cn(
														"w-6 h-6 rounded-md border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
														selected ?
															"border-primary bg-primary text-primary-foreground"
														:	"border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/50",
													)}>
													{String.fromCharCode(65 + i)}
												</div>
												<Checkbox
													id={`${q.id}-${opt.id}`}
													checked={selected}
													onCheckedChange={toggle}
													className='sr-only'
												/>
												<Label
													htmlFor={`${q.id}-${opt.id}`}
													className='flex-1 font-medium cursor-pointer text-sm leading-snug'>
													{opt.text}
												</Label>
												{selected && (
													<CheckCircle2 className='w-4 h-4 text-primary animate-in zoom-in-50' />
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
											<span className='font-mono'>
												{q.testCasesVisible[0].input} →{" "}
												{q.testCasesVisible[0].expected}
											</span>
											{q.hiddenCount ?
												` · ${q.hiddenCount} hidden test cases`
											:	null}
										</p>
									)}
									<CodeEditor
										value={(answers[q.id] as string) ?? q.starterCode ?? ""}
										onChange={(val) => setAnswer(val)}
										language={q.type}
										placeholder='Write your solution here...'
									/>
									<p className='text-xs text-muted-foreground flex items-center gap-1.5'>
										<Terminal className='w-3 h-3' />
										Manual review — code is not auto-executed
									</p>
								</div>
							)}

							{q.type === "subjective" && (
								<Textarea
									placeholder='Type your answer here…'
									value={(answers[q.id] as string) || ""}
									onChange={(e) => setAnswer(e.target.value)}
									rows={6}
								/>
							)}
						</div>

						<Separator />

						<div className='flex items-center justify-between px-4 py-2 sm:px-6'>
							<Button
								variant='ghost'
								size='sm'
								className='h-8 px-2.5 text-xs'
								disabled={current === 0}
								onClick={() => setCurrent((c) => c - 1)}>
								<ChevronLeft className='w-4 h-4 mr-1.5' /> Previous
							</Button>

							{current < activeQuestions.length - 1 ?
								<Button
									variant='outline'
									size='sm'
									className='h-8 px-2.5 text-xs'
									onClick={() => setCurrent((c) => c + 1)}>
									Save and next <ChevronRight className='w-4 h-4 ml-1.5' />
								</Button>
							:	<Button
									size='sm'
									className='h-8 px-2.5 text-xs'
									onClick={() => setIsConfirmingSubmit(true)}
									disabled={roundSubmitting || submitting}>
									<Send className='w-3.5 h-3.5 mr-1.5' />
									{roundSubmitting ?
										"Submitting…"
									: roundIdx < ROUNDS.length - 1 ?
										`Submit Round ${activeRound.id} & Continue`
									:	"Submit Test"}
								</Button>
							}
						</div>
					</CardContent>
				</Card>
			</div>

			<Dialog
				open={isConfirmingSubmit}
				onOpenChange={setIsConfirmingSubmit}>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Submit {activeRound.label} Round?</DialogTitle>
						<DialogDescription>
							You have answered {answeredCount} out of {activeQuestions.length}{" "}
							questions. Once you submit, you cannot return to this round to
							change your answers.
						</DialogDescription>
					</DialogHeader>
					<div className='flex items-center space-x-2 py-4'>
						{answeredCount < activeQuestions.length && (
							<Alert variant='destructive'>
								<ShieldAlert className='h-4 w-4' />
								<AlertDescription>
									You still have {activeQuestions.length - answeredCount}{" "}
									unanswered questions in this round.
								</AlertDescription>
							</Alert>
						)}
					</div>
					<DialogFooter className='sm:justify-end gap-2'>
						<Button
							type='button'
							variant='secondary'
							onClick={() => setIsConfirmingSubmit(false)}>
							Go back
						</Button>
						<Button
							type='button'
							onClick={handleSubmitRound}
							disabled={roundSubmitting}>
							{roundSubmitting ? "Submitting..." : "Yes, submit round"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
