import { useState, useEffect, useRef } from "react";

interface UseIdleTimeoutProps {
	idleThresholdSeconds?: number;
	countdownSeconds?: number;
	onLogout: () => void | Promise<void>;
}

export function useIdleTimeout({
	idleThresholdSeconds = 30,
	countdownSeconds = 1200,
	onLogout,
}: UseIdleTimeoutProps) {
	const [isIdle, setIsIdle] = useState(false);
	const [remainingSeconds, setRemainingSeconds] = useState(countdownSeconds);

	const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
	const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
	const onLogoutRef = useRef(onLogout);

	useEffect(() => {
		onLogoutRef.current = onLogout;
	}, [onLogout]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

		const resetIdleTimer = () => {
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

			setIsIdle(false);
			setRemainingSeconds(countdownSeconds);

			idleTimerRef.current = setTimeout(() => {
				setIsIdle(true);
			}, idleThresholdSeconds * 1000);
		};

		resetIdleTimer();

		activityEvents.forEach((event) => {
			window.addEventListener(event, resetIdleTimer);
		});

		return () => {
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
			activityEvents.forEach((event) => {
				window.removeEventListener(event, resetIdleTimer);
			});
		};
	}, [idleThresholdSeconds, countdownSeconds]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		if (isIdle) {
			countdownTimerRef.current = setInterval(() => {
				setRemainingSeconds((prev) => {
					if (prev <= 1) {
						if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
						void onLogoutRef.current();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}

		return () => {
			if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
		};
	}, [isIdle]);

	return { isIdle, remainingSeconds };
}
