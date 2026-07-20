import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Clock, CheckCircle2, ShieldAlert, Lock, ChevronRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Question, MCQOption, QuestionType } from "@/types/metadata";
import type { Candidate, AnswerValue, SavedAttempt } from "@/types/candidate";
import { AssessmentRoundCard } from "./assessment-round-card";
import { AssessmentStatusBar } from "./assessment-status-bar";
import { getAssessmentRounds } from "@/data/assessment-rounds";
import { useSecurityGuard } from "@/hooks/useSecurityGuard";
import { useExamTimer } from "@/hooks/useExamTimer";
import { QuestionNavigator } from "./question-navigator";
import { ActiveQuestionPanel } from "./active-question-panel";

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
	serverSecondsLeft?: number | null;
	serverSecondsUsed?: number;
	onHeartbeat?: (secondsUsed: number) => void;
	onStart?: () => void;
};

const ATTEMPT_STORAGE_KEY = "assessment-attempt";
const ASSESSMENT_VERSION = "round-flow-v2";

function getSavedAttempt(candidateEmail: string): SavedAttempt | null {
	if (typeof window === "undefined") return null;
	try {
		const saved = JSON.parse(
			sessionStorage.getItem(ATTEMPT_STORAGE_KEY) ?? "null",
		) as SavedAttempt | null;
		return (
				saved?.candidateEmail === candidateEmail &&
					saved.version === ASSESSMENT_VERSION
			) ?
				saved
			:	null;
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
	serverSecondsLeft,
	serverSecondsUsed = 0,
	onHeartbeat = () => {},
	onStart = () => {},
}: Props) {
	const [savedAttempt] = useState(() => getSavedAttempt(candidate.email));
	const ROUNDS = useMemo(
		() => getAssessmentRounds(candidate.role ?? ""),
		[candidate.role],
	);

	const savedRoundIndex = useMemo(() => {
		if (savedAttempt) return savedAttempt.roundIdx;
		let elapsed = serverSecondsUsed;
		for (let i = 0; i < ROUNDS.length; i++) {
			if (elapsed < ROUNDS[i].durationSeconds) {
				return i;
			}
			elapsed -= ROUNDS[i].durationSeconds;
		}
		return ROUNDS.length - 1;
	}, [savedAttempt, serverSecondsUsed, ROUNDS]);

	// Split and shuffle questions into rounds
	const roundQuestions = useMemo(() => {
		return ROUNDS.map((r) => {
			const filtered = questions.filter((q) => r.types.includes(q.type));
			const shuffled = [...filtered].sort((a, b) => a.id.localeCompare(b.id)); // Deterministic sort
			return shuffled.slice(0, r.limit);
		});
	}, [ROUNDS, questions]);

	const [roundIdx, setRoundIdx] = useState(savedRoundIndex);
	const [completedRounds, setCompletedRounds] = useState<number[]>(
		savedAttempt?.completedRounds ?? [],
	);
	const [current, setCurrent] = useState(savedAttempt?.current ?? 0);
	const [answers, setAnswers] = useState<Record<string, AnswerValue>>(
		savedAttempt?.answers ?? {},
	);
	const [flagged, setFlagged] = useState<Record<string, boolean>>(
		savedAttempt?.flagged ?? {},
	);

	const [tabSwitches, setTabSwitches] = useState(
		savedAttempt?.tabSwitches ?? 0,
	);
	const [mcqFlagUses, setMcqFlagUses] = useState(
		savedAttempt?.mcqFlagUses ?? 0,
	);
	const [showWarning, setShowWarning] = useState(false);
	const [draftAnswers, setDraftAnswers] = useState<Record<string, AnswerValue>>(
		{},
	);
	const [allSubmitted, setAllSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [roundSubmitting, setRoundSubmitting] = useState(false);
	const [hasStarted, setHasStarted] = useState(
		savedAttempt?.hasStarted ?? false,
	);
	const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
	const [showRoundGate, setShowRoundGate] = useState(
		savedAttempt?.showRoundGate ?? false,
	);
	const guardRef = useRef<HTMLDivElement>(null);

	// Timer Refs to isolate state ticks and prevent keyboard/editor lags
	const secondsLeftRef = useRef(0);
	const secondsUsedRef = useRef(0);
	const setSecondsLeftRef = useRef<((secs: number) => void) | null>(null);
	const [isExamTimeUp, setIsExamTimeUp] = useState(false);

	const activeRound = ROUNDS[roundIdx] ?? ROUNDS[0];
	const activeQuestions = roundQuestions[roundIdx] ?? roundQuestions[0] ?? [];
	const q = activeQuestions[current];
	const hasQuestions = activeQuestions.length > 0;

	// Submit entire assessment
	const handleSubmitAll = useCallback(async () => {
		setSubmitting(true);
		try {
			const usedSeconds = ROUNDS.reduce((acc, r, i) => {
				if (i < roundIdx) return acc + r.durationSeconds;
				if (i === roundIdx) return acc + (r.durationSeconds - secondsLeftRef.current);
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
	}, [ROUNDS, answers, flagged, tabSwitches, roundIdx, onSubmit]);

	// Note: useExamTimer is instantiated inside the self-contained <ExamTimer> subcomponent
	// to isolate second-by-second re-renders from the main assessment screen.

	useSecurityGuard({
		hasStarted,
		allSubmitted,
		setTabSwitches,
		setShowWarning,
		guardRef,
		candidateId: candidate.id,
	});

	// Attempt backup serialization effect on structural changes
	useEffect(() => {
		if (!hasStarted || allSubmitted) return;
		const snapshot: SavedAttempt = {
			version: ASSESSMENT_VERSION,
			candidateEmail: candidate.email,
			roundIdx,
			completedRounds,
			current,
			answers,
			flagged,
			secondsLeft: secondsLeftRef.current,
			secondsUsed: secondsUsedRef.current,
			tabSwitches,
			mcqFlagUses,
			hasStarted,
			showRoundGate,
			savedAt: Date.now(),
		};
		sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(snapshot));
	}, [
		answers,
		allSubmitted,
		candidate.email,
		completedRounds,
		current,
		flagged,
		hasStarted,
		mcqFlagUses,
		roundIdx,
		showRoundGate,
		tabSwitches,
	]);

	// Periodic backup serialization effect (every 10s) to keep time current in case of crash
	useEffect(() => {
		if (!hasStarted || allSubmitted || showRoundGate) return;
		const interval = setInterval(() => {
			const snapshot: SavedAttempt = {
				version: ASSESSMENT_VERSION,
				candidateEmail: candidate.email,
				roundIdx,
				completedRounds,
				current,
				answers,
				flagged,
				secondsLeft: secondsLeftRef.current,
				secondsUsed: secondsUsedRef.current,
				tabSwitches,
				mcqFlagUses,
				hasStarted,
				showRoundGate,
				savedAt: Date.now(),
			};
			sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(snapshot));
		}, 10000);
		return () => clearInterval(interval);
	}, [
		answers,
		allSubmitted,
		candidate.email,
		completedRounds,
		current,
		flagged,
		hasStarted,
		mcqFlagUses,
		roundIdx,
		showRoundGate,
		tabSwitches,
	]);

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
	}, [ROUNDS.length, activeRound.id, roundIdx, handleSubmitAll]);

	function advanceToNextRound() {
		const nextIndex = roundIdx + 1;
		setShowRoundGate(false);
		setSecondsLeftRef.current?.(ROUNDS[nextIndex].durationSeconds);
		setCurrent(0);
		setRoundIdx(nextIndex);
	}

	function startAssessment() {
		sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
		setSecondsLeftRef.current?.(ROUNDS[0].durationSeconds);
		setCurrent(0);
		setHasStarted(true);
		onStart();
	}

	function finishAssessment() {
		sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
		onDone();
	}

	function setAnswer(val: AnswerValue) {
		if (!q) return;
		setDraftAnswers((curr) => ({ ...curr, [q.id]: val }));
	}

	function saveCurrentAnswer() {
		if (!q || !(q.id in draftAnswers)) return;
		setAnswers((curr) => ({ ...curr, [q.id]: draftAnswers[q.id] }));
		setDraftAnswers((curr) => {
			const remaining = { ...curr };
			delete remaining[q.id];
			return remaining;
		});
	}

	function saveAndNext() {
		saveCurrentAnswer();
		setCurrent((index) => index + 1);
	}

	const isMcqRound = activeRound.id === 1;
	const isSingleRoundAssessment = ROUNDS.length === 1;
	const canFlagCurrent = flagged[q?.id ?? ""] || !isMcqRound || mcqFlagUses < 5;
	const displayedAnswer = q ? (draftAnswers[q.id] ?? answers[q.id]) : undefined;

	function toggleFlag() {
		if (!q) return;
		if (flagged[q.id]) {
			setFlagged((curr) => ({ ...curr, [q.id]: false }));
			return;
		}

		if (isMcqRound && mcqFlagUses >= 5) return;

		saveCurrentAnswer();

		setFlagged((curr) => ({ ...curr, [q.id]: true }));
		if (isMcqRound) setMcqFlagUses((count) => count + 1);
		if (current < activeQuestions.length - 1) setCurrent((index) => index + 1);
	}

	function selectQuestion(index: number) {
		const target = activeQuestions[index];
		if (index >= 0 && index < activeQuestions.length) {
			if (index === current || (isMcqRound && (flagged[target.id] || (mcqFlagUses >= 5 && index <= current + 1)))) {
				saveCurrentAnswer();
				setCurrent(index);
			}
		}
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
			<Card className='min-h-100 flex items-center justify-center border-emerald-100 shadow-sm bg-white'>
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
						<p className='text-muted-foreground text-sm'>
							Great job, {candidate.name.split(" ")[0]}! You have successfully
							submitted all rounds of the assessment.
						</p>
					</div>
					<div className='bg-muted/50 p-4 rounded-xl text-sm text-left space-y-2 border'>
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
						className='w-full cursor-pointer rounded-xl'
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
			<div className='mx-auto max-w-5xl space-y-5'>
				<Card className='overflow-hidden border-slate-200 shadow-sm bg-white'>
					<CardContent className='p-6 sm:p-8'>
						<div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
							<div className='flex items-center gap-4'>
								<div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-bold text-[#4F46E5]'>
									{candidate.name
										.split(" ")
										.map((name) => name[0])
										.join("")
										.slice(0, 2)
										.toUpperCase()}
								</div>
								<div>
									<p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#4F46E5]'>
										Assessment briefing
									</p>
									<h1 className='mt-1 text-2xl font-bold text-slate-900'>
										Welcome, {candidate.name.split(" ")[0]}
									</h1>
									<p className='mt-1 text-sm text-slate-500'>
										{candidate.role} · {candidate.experience} years experience
									</p>
								</div>
							</div>
							<div className='rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600'>
								Your timer starts only after you begin Round 1.
							</div>
						</div>
					</CardContent>
				</Card>

				<div>
					<p className='mb-3 text-sm font-semibold text-slate-800'>
						{isSingleRoundAssessment ? "Your assessment" : "Assessment structure"}
					</p>
					<div className={cn("grid gap-4", isSingleRoundAssessment ? "max-w-md" : "md:grid-cols-3")}>
						{ROUNDS.map((r, i) => (
							<AssessmentRoundCard
								key={r.id}
								round={r}
								questionCount={roundQuestions[i].length}
								index={i}
								compact
							/>
						))}
					</div>
				</div>

				<Card className='border-amber-200 bg-amber-50/50'>
					<CardContent className='p-5'>
						<div className='flex items-center gap-2 text-sm font-bold text-amber-900'>
							<ShieldAlert className='h-4 w-4' /> Assessment rules
						</div>
						<div className='mt-4 grid gap-x-8 gap-y-3 text-xs leading-relaxed text-amber-900 sm:grid-cols-2'>
							{!isSingleRoundAssessment && <p><strong>Sequential rounds:</strong> submit a round to unlock the next one. Completed rounds are locked permanently.</p>}
							<p><strong>Save and next:</strong> an answer is recorded only when you use Save and next, or submit the round.</p>
							<p><strong>MCQ review:</strong> you may flag up to 5 MCQs. A flag use is permanent, even if you later unflag the question.</p>
							{!isSingleRoundAssessment && <p><strong>Forward only:</strong> subjective and coding questions cannot be reopened after Save and next.</p>}
							<p><strong>Time limits:</strong> each round auto-submits when its individual timer reaches zero.</p>
							<p><strong>Integrity:</strong> tab switches are logged and deduct 10 marks each. Copy, paste, and right-click are disabled.</p>
						</div>
					</CardContent>
				</Card>

				<Button onClick={startAssessment} className='w-full bg-[#4F46E5] hover:bg-[#4338CA] cursor-pointer rounded-xl' size='lg'>
					I understand the rules — start Round 1
				</Button>
			</div>
		);
	}

	// ── Round Gate (Transition) ──
	if (showRoundGate) {
		const nextRound = ROUNDS[roundIdx + 1];
		return (
			<Card className='max-w-xl mx-auto bg-white border border-slate-100 shadow-sm'>
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
								className='w-full cursor-pointer rounded-xl'
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
			<Card className='min-h-100 flex items-center justify-center bg-white'>
				<CardContent className='text-center max-w-md px-6 py-10 space-y-4'>
					<p className='text-sm text-muted-foreground'>
						No questions available for {activeRound.label} round.
					</p>
					{roundIdx < ROUNDS.length - 1 ?
						<Button onClick={advanceToNextRound} className='cursor-pointer rounded-xl'>
							Next Round
						</Button>
					:	<Button
							onClick={handleSubmitAll}
							className='cursor-pointer rounded-xl'
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
			<Card className='overflow-hidden border-slate-200 shadow-sm bg-white'>
				<CardContent className='p-4 sm:p-5'>
					<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4'>
						<div className='flex min-w-0 items-center gap-3'>
							<div className='w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0'>
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

						<div className='flex shrink-0 items-center gap-4 w-full sm:w-auto justify-start sm:justify-end'>
							<ExamTimer
								hasStarted={hasStarted}
								allSubmitted={allSubmitted}
								showRoundGate={showRoundGate}
								ROUNDS={ROUNDS}
								activeRound={activeRound}
								roundIdx={roundIdx}
								serverSecondsUsed={serverSecondsUsed}
								savedAttempt={savedAttempt}
								onHeartbeat={onHeartbeat}
								onSubmitAll={handleSubmitAll}
								setCompletedRounds={setCompletedRounds}
								setShowRoundGate={setShowRoundGate}
								secondsLeftRef={secondsLeftRef}
								secondsUsedRef={secondsUsedRef}
								setIsExamTimeUp={setIsExamTimeUp}
								setSecondsLeftRef={setSecondsLeftRef}
							/>
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
				{/* Sidebar Navigator */}
				<QuestionNavigator
					activeQuestions={activeQuestions}
					current={current}
					answeredCount={answeredCount}
					progressPercent={progressPercent}
					isExamTimeUp={isExamTimeUp}
					submitting={submitting}
					roundSubmitting={roundSubmitting}
					isMcqRound={isMcqRound}
					flagged={flagged}
					mcqFlagUses={mcqFlagUses}
					statusFor={statusFor}
					selectQuestion={selectQuestion}
					activeRoundId={activeRound.id}
				/>

				{/* Active Question Panel */}
				<ActiveQuestionPanel
					q={q}
					current={current}
					setCurrent={setCurrent}
					activeQuestions={activeQuestions}
					answers={answers}
					draftAnswers={draftAnswers}
					flagged={flagged}
					mcqFlagUses={mcqFlagUses}
					isMcqRound={isMcqRound}
					canFlagCurrent={canFlagCurrent}
					displayedAnswer={displayedAnswer}
					isExamTimeUp={isExamTimeUp}
					submitting={submitting}
					roundSubmitting={roundSubmitting}
					roundIdx={roundIdx}
					activeRound={activeRound}
					ROUNDS={ROUNDS}
					setAnswer={setAnswer}
					toggleFlag={toggleFlag}
					saveCurrentAnswer={saveCurrentAnswer}
					saveAndNext={saveAndNext}
					setIsConfirmingSubmit={setIsConfirmingSubmit}
				/>
			</div>

			<Dialog
				open={isConfirmingSubmit}
				onOpenChange={setIsConfirmingSubmit}>
				<DialogContent className='sm:max-w-md bg-white border'>
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
							className='cursor-pointer rounded-xl'
							onClick={() => setIsConfirmingSubmit(false)}>
							Go back
						</Button>
						<Button
							type='button'
							className='cursor-pointer rounded-xl'
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

type ExamTimerProps = {
	hasStarted: boolean;
	allSubmitted: boolean;
	showRoundGate: boolean;
	ROUNDS: any[];
	activeRound: any;
	roundIdx: number;
	serverSecondsUsed: number;
	savedAttempt: SavedAttempt | null;
	onHeartbeat: (secondsUsed: number) => void;
	onSubmitAll: () => Promise<void>;
	setCompletedRounds: React.Dispatch<React.SetStateAction<number[]>>;
	setShowRoundGate: React.Dispatch<React.SetStateAction<boolean>>;
	secondsLeftRef: React.MutableRefObject<number>;
	secondsUsedRef: React.MutableRefObject<number>;
	setIsExamTimeUp: (val: boolean) => void;
	setSecondsLeftRef: React.MutableRefObject<((secs: number) => void) | null>;
};

function ExamTimer({
	hasStarted,
	allSubmitted,
	showRoundGate,
	ROUNDS,
	activeRound,
	roundIdx,
	serverSecondsUsed,
	savedAttempt,
	onHeartbeat,
	onSubmitAll,
	setCompletedRounds,
	setShowRoundGate,
	secondsLeftRef,
	secondsUsedRef,
	setIsExamTimeUp,
	setSecondsLeftRef,
}: ExamTimerProps) {
	const { secondsLeft, setSecondsLeft, secondsUsed, isExamTimeUp } = useExamTimer({
		hasStarted,
		allSubmitted,
		showRoundGate,
		ROUNDS,
		activeRound,
		roundIdx,
		serverSecondsUsed,
		savedAttempt,
		onHeartbeat,
		onSubmitAll,
		setCompletedRounds,
		setShowRoundGate,
	});

	useEffect(() => {
		secondsLeftRef.current = secondsLeft;
	}, [secondsLeft, secondsLeftRef]);

	useEffect(() => {
		secondsUsedRef.current = secondsUsed;
	}, [secondsUsed, secondsUsedRef]);

	useEffect(() => {
		setIsExamTimeUp(isExamTimeUp);
	}, [isExamTimeUp, setIsExamTimeUp]);

	useEffect(() => {
		setSecondsLeftRef.current = setSecondsLeft;
		return () => {
			setSecondsLeftRef.current = null;
		};
	}, [setSecondsLeft, setSecondsLeftRef]);

	const pctLeft = secondsLeft / activeRound.durationSeconds;
	const timerTone =
		pctLeft > 0.5 ? "ok"
		: pctLeft > 0.15 ? "warn"
		: "danger";

	return (
		<div
			className={cn(
				"flex items-center gap-2 px-4 py-1.5 rounded-full border-2 text-lg font-mono font-bold shadow-sm transition-all w-full sm:w-auto justify-center sm:justify-start",
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
	);
}
