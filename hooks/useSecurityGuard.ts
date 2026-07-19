import { useEffect } from "react";

/**
 * Custom hook to enforce anti-cheating rules on the candidate test screen:
 * - Detects browser tab switches / minimization.
 * - Disables context menu, copy and paste within the exam container.
 * - Warns before browser tab closure (beforeunload).
 */
export function useSecurityGuard({
	hasStarted,
	allSubmitted,
	setTabSwitches,
	setShowWarning,
	guardRef,
}: {
	hasStarted: boolean;
	allSubmitted: boolean;
	setTabSwitches: React.Dispatch<React.SetStateAction<number>>;
	setShowWarning: React.Dispatch<React.SetStateAction<boolean>>;
	guardRef: React.RefObject<HTMLDivElement | null>;
}) {
	// Detect browser window visibility changes
	useEffect(() => {
		if (!hasStarted || allSubmitted) return;

		const onVisibility = () => {
			if (document.hidden) {
				setTabSwitches((n) => n + 1);
				setShowWarning(true);
			}
		};

		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [hasStarted, allSubmitted, setTabSwitches, setShowWarning]);

	// Intercept right-click, copy and paste events inside container
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
	}, [guardRef]);

	// Warn when attempting to close or refresh the tab
	useEffect(() => {
		if (!hasStarted || allSubmitted) return;

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "Are you sure you want to leave the exam? Your progress will be lost.";
			return e.returnValue;
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasStarted, allSubmitted]);
}
