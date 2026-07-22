"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CandidateTestScreen } from "@/components/candidate/candidate-test-screen";
import type { Candidate, AnswerValue } from "@/types/candidate";
import { ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSessionSync } from "@/hooks/useSessionSync";
import {
	sendHeartbeat,
	startAssessmentSession,
	syncAssessmentSession,
	fetchAssessmentQuestions,
	submitAssessmentResults,
	finalizeAssessmentSession,
} from "@/services/client/assessment.service";

let cachedCandidateValue: string | null = null;
let cachedCandidate: Candidate | null = null;

function getStoredCandidate(): Candidate | null {
	if (typeof window === "undefined") return null;

	const value = sessionStorage.getItem("candidate");
	if (value === cachedCandidateValue) return cachedCandidate;

	cachedCandidateValue = value;
	try {
		cachedCandidate = value ? (JSON.parse(value) as Candidate) : null;
	} catch {
		cachedCandidate = null;
	}
	return cachedCandidate;
}

function subscribeToCandidate() {
	return () => {};
}

export default function InterviewPage() {
	const router = useRouter();
	const candidate = useSyncExternalStore(
		subscribeToCandidate,
		getStoredCandidate,
		() => null,
	);

	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Use custom hooks
	const {
		questions,
		setQuestions,
		loading,
		setLoading,
		sessionToken,
		setSessionToken,
		serverSecondsLeft,
		setServerSecondsLeft,
		serverSecondsUsed,
		setServerSecondsUsed,
		blockReason,
		setBlockReason,
	} = useSessionSync(candidate, mounted);

	// Handle candidate redirection if not present
	useEffect(() => {
		if (mounted && !candidate) {
			router.replace("/");
		}
	}, [candidate, mounted, router]);

	// Sync handler for heartbeat tick updates
	const handleHeartbeat = async (elapsed: number) => {
		if (!candidate || !sessionToken) return;
		try {
			const data = await sendHeartbeat({
				candidateId: candidate.id!,
				sessionToken,
				secondsUsed: elapsed,
			});

			if (data.status === "submitted") {
				setBlockReason("submitted");
			} else if (data.status === "expired") {
				setBlockReason("expired");
			} else if (typeof data.remainingSeconds === "number") {
				setServerSecondsLeft(data.remainingSeconds);
				setServerSecondsUsed(data.secondsUsed ?? elapsed);
			}
		} catch (err: any) {
			if (err.message === "conflict") {
				setBlockReason("conflict");
			} else {
				console.error("Heartbeat error:", err);
			}
		}
	};

	// Start assessment session callback
	const handleStartExam = async () => {
		if (!candidate || !sessionToken) return;
		try {
			const data = await startAssessmentSession({
				candidateId: candidate.id!,
				sessionToken,
			});
			if (typeof data.remainingSeconds === "number") {
				setServerSecondsLeft(data.remainingSeconds);
			}
		} catch (err: any) {
			if (err.message === "conflict") {
				setBlockReason("conflict");
			} else {
				console.error("Start exam error:", err);
			}
		}
	};

	// Handle exam submissions
	async function handleSubmit(payload: {
		answers: Record<string, AnswerValue>;
		flagged: string[];
		tabSwitches: number;
		secondsUsed: number;
	}) {
		if (!candidate || !sessionToken) return;

		const answers = questions.map((q) => {
			const given = payload.answers[q.id];
			let isCorrect: boolean | undefined;

			if (q.type === "mcq_single" || q.type === "output_prediction") {
				isCorrect = given === q.correctOptionId;
			} else if (q.type === "mcq_multi" && q.correctOptionIds) {
				const givenArr = (given as string[]) || [];
				isCorrect =
					givenArr.length === q.correctOptionIds.length &&
					givenArr.every((id) => q.correctOptionIds!.includes(id));
			}

			return {
				questionId: q.id,
				questionTopic: q.topic,
				questionType: q.type,
				answerValue: given ?? (q.type === "mcq_multi" ? [] : ""),
				isCorrect,
			};
		});

		// Post exam answers results
		await submitAssessmentResults({
			candidate,
			answers,
			tabSwitches: payload.tabSwitches,
			secondsUsed: payload.secondsUsed,
		});

		// Finalize backend exam session
		await finalizeAssessmentSession({
			candidateId: candidate.id!,
			sessionToken,
			secondsUsed: payload.secondsUsed,
		});
	}

	function handleDone() {
		sessionStorage.removeItem("candidate");
		sessionStorage.removeItem("sessionToken");
		sessionStorage.removeItem("assessment-attempt");
		router.push("/");
	}

	async function forceRestart() {
		if (!candidate) return;
		setLoading(true);
		try {
			const data = await syncAssessmentSession({
				candidateId: candidate.id!,
				candidateEmail: candidate.email,
				role: candidate.role,
				experience: candidate.experience,
				force: true,
			});

			sessionStorage.setItem("sessionToken", data.sessionToken);
			setSessionToken(data.sessionToken);
			setServerSecondsLeft(data.remainingSeconds);
			setBlockReason(null);

			const qs = await fetchAssessmentQuestions(
				candidate.role,
				candidate.experience,
			);
			setQuestions(qs);
		} catch (err) {
			console.error("Force restart failed:", err);
		} finally {
			setLoading(false);
		}
	}

	if (!candidate || loading) {
		return (
			<div className='min-h-screen flex items-center justify-center text-sm text-muted-foreground bg-slate-50'>
				<div className='animate-pulse'>Loading interview session...</div>
			</div>
		);
	}

	if (blockReason === "conflict") {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
				<Card className='max-w-md w-full border-amber-200 shadow-lg bg-white'>
					<CardContent className='text-center p-8 space-y-6'>
						<div className='w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-100'>
							<ShieldAlert className='w-8 h-8 text-amber-600' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
								Session Terminated
							</h2>
							<p className='text-sm text-slate-500 leading-relaxed'>
								This exam session has been terminated here because it was opened
								on another device or tab.
							</p>
						</div>
						<div className='bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800 font-medium space-y-1'>
							<p className='font-bold'>What would you like to do?</p>
							<p>
								If you want to pull the session back to this window, click{" "}
								<strong>&ldquo;Continue in This Window&rdquo;</strong>.
							</p>
							<p>Otherwise, you can close this window or return to registration.</p>
						</div>
						<div className='flex flex-col gap-2'>
							<Button
								onClick={forceRestart}
								className='w-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer rounded-xl'>
								Continue in This Window
							</Button>
							<Button
								variant='outline'
								onClick={() => router.push("/")}
								className='w-full cursor-pointer rounded-xl'>
								Back to Registration
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (blockReason === ("terminated" as any)) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
				<Card className='max-w-md w-full border-red-200 shadow-lg bg-white overflow-hidden relative'>
					<div className='absolute top-0 left-0 right-0 h-1.5 bg-red-550' />
					<CardContent className='text-center p-8 space-y-6'>
						<div className='w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-100'>
							<ShieldAlert className='w-8 h-8 text-red-600' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
								Application Process Terminated
							</h2>
							<p className='text-sm text-slate-500 leading-relaxed font-semibold'>
								Thank you for your interest. Unfortunately, your application has been terminated at a previous round of the evaluation process.
							</p>
						</div>
						<Button
							onClick={() => router.push("/")}
							className='w-full bg-slate-900 hover:bg-slate-800 cursor-pointer rounded-xl font-bold'>
							Return Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (blockReason === "submitted") {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
				<Card className='max-w-md w-full border-emerald-200 shadow-lg bg-white'>
					<CardContent className='text-center p-8 space-y-6'>
						<div className='w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-100'>
							<CheckCircle2 className='w-8 h-8 text-emerald-600' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
								Exam Completed
							</h2>
							<p className='text-sm text-slate-500 leading-relaxed'>
								You have already completed the assessment for this specific
								vacancy.
							</p>
						</div>
						<Button
							onClick={() => router.push("/")}
							className='w-full bg-slate-900 hover:bg-slate-800 cursor-pointer rounded-xl'>
							Return Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (blockReason === "expired") {
		return (
			<div className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
				<Card className='max-w-md w-full border-amber-200 shadow-lg bg-white'>
					<CardContent className='text-center p-8 space-y-6'>
						<div className='w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-100'>
							<Clock className='w-8 h-8 text-amber-600 animate-pulse' />
						</div>
						<div className='space-y-2'>
							<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
								Exam Expired
							</h2>
							<p className='text-sm text-slate-500 leading-relaxed'>
								The time limit for this exam has expired. Your progress has been
								automatically saved and submitted.
							</p>
						</div>
						<Button
							onClick={() => router.push("/")}
							className='w-full bg-slate-900 hover:bg-slate-800 cursor-pointer rounded-xl'>
							Return Home
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-background p-4'>
			<CandidateTestScreen
				candidate={candidate}
				questions={questions}
				onSubmit={handleSubmit}
				onDone={handleDone}
				serverSecondsLeft={serverSecondsLeft}
				serverSecondsUsed={serverSecondsUsed}
				onHeartbeat={handleHeartbeat}
				onStart={handleStartExam}
			/>
		</div>
	);
}
