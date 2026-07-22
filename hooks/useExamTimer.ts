import { useState, useEffect, useRef } from "react";
import type { SavedAttempt } from "@/types/candidate";
import type { AssessmentRound } from "@/constants/assessment-rounds";

/**
 * Custom hook to run a drift-free local countdown timer, sync it
 * periodically with the database via heartbeats, and handle transitions
 * when the round timer expires.
 */
export function useExamTimer({
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
}: {
	hasStarted: boolean;
	allSubmitted: boolean;
	showRoundGate: boolean;
	ROUNDS: AssessmentRound[];
	activeRound: AssessmentRound;
	roundIdx: number;
	serverSecondsUsed: number;
	savedAttempt: SavedAttempt | null;
	onHeartbeat: (secondsUsed: number) => void;
	onSubmitAll: () => Promise<void>;
	setCompletedRounds: React.Dispatch<React.SetStateAction<number[]>>;
	setShowRoundGate: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	// 1. Single Source of Truth for Elapsed Time
	const [totalSecondsUsed, setTotalSecondsUsed] = useState<number>(() => {
		if (savedAttempt) {
			if (savedAttempt.showRoundGate || !savedAttempt.hasStarted) {
				return savedAttempt.secondsUsed;
			}
			return (
				savedAttempt.secondsUsed +
				Math.floor((Date.now() - savedAttempt.savedAt) / 1000)
			);
		}
		return serverSecondsUsed ?? 0;
	});

	// 2. Derivation of Round Progress
	const precedingDuration = ROUNDS.slice(0, roundIdx).reduce((acc, r) => acc + r.durationSeconds, 0);
	const activeDuration = activeRound.durationSeconds;
	const secondsLeft = Math.max(0, precedingDuration + activeDuration - totalSecondsUsed);
	const isExamTimeUp = secondsLeft <= 0;

	// 3. Stale Dependency Defense: keep state values inside useRef capsule
	const stateRef = useRef({
		hasStarted,
		allSubmitted,
		showRoundGate,
		totalSecondsUsed,
		roundIdx,
		ROUNDS,
		activeRound,
		secondsLeft,
	});

	useEffect(() => {
		stateRef.current = {
			hasStarted,
			allSubmitted,
			showRoundGate,
			totalSecondsUsed,
			roundIdx,
			ROUNDS,
			activeRound,
			secondsLeft,
		};
	});

	// 4. Fresh Round Index Transitions: skip first mount to protect savedAttempt reloading
	const isMountedRef = useRef(false);
	useEffect(() => {
		if (!isMountedRef.current) {
			isMountedRef.current = true;
			return;
		}
		const prec = ROUNDS.slice(0, roundIdx).reduce((acc, r) => acc + r.durationSeconds, 0);
		setTotalSecondsUsed(prec);
	}, [roundIdx, ROUNDS]);

	// 5. Drift-Free Timer Interval
	useEffect(() => {
		const t = setInterval(() => {
			const {
				hasStarted: currHasStarted,
				allSubmitted: currAllSubmitted,
				showRoundGate: currShowRoundGate,
				totalSecondsUsed: currTotalSecondsUsed,
				roundIdx: currRoundIdx,
				ROUNDS: currROUNDS,
				activeRound: currActiveRound,
				secondsLeft: currSecondsLeft,
			} = stateRef.current;

			if (currAllSubmitted || currShowRoundGate || !currHasStarted || currSecondsLeft <= 0) {
				return;
			}

			const nextSecondsUsed = currTotalSecondsUsed + 1;
			setTotalSecondsUsed(nextSecondsUsed);

			// Check if new seconds left would trigger a transition
			const prec = currROUNDS.slice(0, currRoundIdx).reduce((acc, r) => acc + r.durationSeconds, 0);
			const act = currActiveRound.durationSeconds;
			const nextSecondsLeft = Math.max(0, prec + act - nextSecondsUsed);

			if (nextSecondsLeft <= 0) {
				// Safe Action Execution Split: Enforce a tiny asynchronous delay to clear layout collision execution flags
				setTimeout(() => {
					if (currRoundIdx < currROUNDS.length - 1) {
						setCompletedRounds((prev) => [...new Set([...prev, currActiveRound.id])]);
						setShowRoundGate(true);
					} else {
						void onSubmitAll();
					}
				}, 0);
			}
		}, 1000);

		return () => clearInterval(t);
	}, [onSubmitAll, setCompletedRounds, setShowRoundGate]);

	// Heartbeats trigger exactly every 10 seconds
	const onHeartbeatRef = useRef(onHeartbeat);
	useEffect(() => {
		onHeartbeatRef.current = onHeartbeat;
	}, [onHeartbeat]);

	useEffect(() => {
		const h = setInterval(() => {
			const {
				allSubmitted: currAllSubmitted,
				hasStarted: currHasStarted,
				showRoundGate: currShowRoundGate,
				secondsLeft: currSecondsLeft,
				totalSecondsUsed: currTotalSecondsUsed,
			} = stateRef.current;

			if (currAllSubmitted || !currHasStarted || currShowRoundGate || currSecondsLeft <= 0) {
				return;
			}
			onHeartbeatRef.current(currTotalSecondsUsed);
		}, 10000);

		return () => clearInterval(h);
	}, []);

	// Compatibility setters mapping back to single source of truth totalSecondsUsed
	const setSecondsLeft = (value: number | ((prev: number) => number)) => {
		const prec = ROUNDS.slice(0, roundIdx).reduce((acc, r) => acc + r.durationSeconds, 0);
		const act = activeRound.durationSeconds;
		if (typeof value === "function") {
			setTotalSecondsUsed((prevTotal) => {
				const currLeft = Math.max(0, prec + act - prevTotal);
				const nextLeft = value(currLeft);
				return prec + act - nextLeft;
			});
		} else {
			setTotalSecondsUsed(prec + act - value);
		}
	};

	const setSecondsUsed = (value: number | ((prev: number) => number)) => {
		if (typeof value === "function") {
			setTotalSecondsUsed((prev) => value(prev));
		} else {
			setTotalSecondsUsed(value);
		}
	};

	return {
		secondsLeft,
		setSecondsLeft,
		secondsUsed: totalSecondsUsed,
		setSecondsUsed,
		isExamTimeUp,
	};
}
