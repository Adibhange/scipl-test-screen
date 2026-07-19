import { useState, useEffect, useRef } from "react";
import type { SavedAttempt } from "@/types/candidate";
import type { AssessmentRound } from "@/data/assessment-rounds";

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
	const savedRoundIndex = savedAttempt ? savedAttempt.roundIdx : 0;

	// Initialize remaining seconds with self-healing cap
	const [secondsLeft, setSecondsLeft] = useState(() => {
		let initialVal = ROUNDS[0].durationSeconds;
		if (savedAttempt) {
			if (savedAttempt.showRoundGate || !savedAttempt.hasStarted) {
				initialVal = savedAttempt.secondsLeft;
			} else {
				initialVal = Math.max(
					0,
					savedAttempt.secondsLeft -
						Math.floor((Date.now() - savedAttempt.savedAt) / 1000),
				);
			}
		} else {
			let elapsed = serverSecondsUsed ?? 0;
			let found = false;
			for (let i = 0; i < ROUNDS.length; i++) {
				if (elapsed < ROUNDS[i].durationSeconds) {
					initialVal = ROUNDS[i].durationSeconds - elapsed;
					found = true;
					break;
				}
				elapsed -= ROUNDS[i].durationSeconds;
			}
			if (!found) initialVal = 0;
		}

		const activeRoundIndex = savedAttempt ? savedAttempt.roundIdx : savedRoundIndex;
		const activeRoundDuration = ROUNDS[activeRoundIndex]?.durationSeconds ?? ROUNDS[0].durationSeconds;
		return Math.min(initialVal, activeRoundDuration);
	});

	// Initialize running elapsed seconds
	const [secondsUsed, setSecondsUsed] = useState(() => {
		if (savedAttempt) {
			if (savedAttempt.showRoundGate || !savedAttempt.hasStarted)
				return savedAttempt.secondsUsed;
			return (
				savedAttempt.secondsUsed +
				Math.floor((Date.now() - savedAttempt.savedAt) / 1000)
			);
		}
		return serverSecondsUsed ?? 0;
	});

	const isExamTimeUp = secondsLeft <= 0;

	// Local clock interval (ticks once per second, drift-free)
	useEffect(() => {
		if (allSubmitted || showRoundGate || !hasStarted || isExamTimeUp) return;

		const t = setInterval(() => {
			setSecondsUsed((s) => s + 1);
			setSecondsLeft((s) => {
				if (s <= 1) {
					clearInterval(t);
					// Transition round or submit assessment on timer expiration
					if (roundIdx < ROUNDS.length - 1) {
						setCompletedRounds((prev) => [
							...new Set([...prev, activeRound.id]),
						]);
						setShowRoundGate(true);
					} else {
						onSubmitAll();
					}
					return 0;
				}
				return s - 1;
			});
		}, 1000);

		return () => clearInterval(t);
	}, [
		allSubmitted,
		hasStarted,
		showRoundGate,
		isExamTimeUp,
		roundIdx,
		ROUNDS,
		activeRound,
		onSubmitAll,
		setCompletedRounds,
		setShowRoundGate,
	]);

	// Keep references fresh inside side-effects
	const secondsUsedRef = useRef(secondsUsed);
	useEffect(() => {
		secondsUsedRef.current = secondsUsed;
	}, [secondsUsed]);

	// Heartbeats trigger exactly every 10 seconds
	useEffect(() => {
		if (allSubmitted || !hasStarted || showRoundGate || isExamTimeUp) return;
		const h = setInterval(() => {
			onHeartbeat(secondsUsedRef.current);
		}, 10000);
		return () => clearInterval(h);
	}, [allSubmitted, hasStarted, showRoundGate, isExamTimeUp, onHeartbeat]);

	return {
		secondsLeft,
		setSecondsLeft,
		secondsUsed,
		setSecondsUsed,
		isExamTimeUp,
	};
}
