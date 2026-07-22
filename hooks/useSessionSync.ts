import { useEffect, useState } from "react";
import type { Candidate } from "@/types/candidate";
import type { Question } from "@/types/metadata";
import { syncAssessmentSession, fetchAssessmentQuestions } from "@/services/client/assessment.service";

/**
 * Custom hook to manage client-server session synchronization, including
 * initial mount checking, token generation/verification, and real-time
 * BroadcastChannel tab duplicate warnings.
 */
export function useSessionSync(candidate: Candidate | null, mounted: boolean) {
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [sessionToken, setSessionToken] = useState<string | null>(null);
	const [serverSecondsLeft, setServerSecondsLeft] = useState<number | null>(null);
	const [serverSecondsUsed, setServerSecondsUsed] = useState<number>(0);
	const [blockReason, setBlockReason] = useState<"conflict" | "submitted" | "expired" | "terminated" | null>(null);

	// Multi-tab takeover real-time detection via BroadcastChannel
	useEffect(() => {
		if (!candidate) return;

		const channel = new BroadcastChannel(`scipl-exam-${candidate.id}`);
		
		// Ping other open tabs immediately on mount
		channel.postMessage({ type: "new-tab-opened" });

		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (msg && msg.type === "new-tab-opened") {
				// Instantly block this tab if another tab has taken over
				setBlockReason("conflict");
			}
		};

		channel.addEventListener("message", handleMessage);

		return () => {
			channel.removeEventListener("message", handleMessage);
			channel.close();
		};
	}, [candidate]);

	// Session mount-sync
	useEffect(() => {
		if (!mounted) return;
		if (!candidate) {
			Promise.resolve().then(() => setLoading(false));
			return;
		}

		const runSync = async () => {
			try {
				const storedToken = sessionStorage.getItem("sessionToken");
				const [data, qs] = await Promise.all([
					syncAssessmentSession({
						candidateId: candidate.id!,
						candidateEmail: candidate.email,
						role: candidate.role,
						experience: candidate.experience,
						sessionToken: storedToken,
					}),
					fetchAssessmentQuestions(candidate.role, candidate.experience),
				]);

				if (data.status === "submitted") {
					setBlockReason("submitted");
					setLoading(false);
					return;
				}
				if (data.status === "expired") {
					setBlockReason("expired");
					setLoading(false);
					return;
				}

				sessionStorage.setItem("sessionToken", data.sessionToken);
				setSessionToken(data.sessionToken);
				setServerSecondsLeft(data.remainingSeconds);
				setServerSecondsUsed(data.secondsUsed ?? 0);
				setQuestions(qs);
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				if (errorMsg === "conflict") {
					setBlockReason("conflict");
				} else if (errorMsg === "Application Process Terminated") {
					setBlockReason("terminated");
				} else {
					console.error("Session sync failed:", err);
				}
			} finally {
				setLoading(false);
			}
		};

		runSync();
	}, [candidate, mounted]);

	return {
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
	};
}
export type SessionSyncResult = ReturnType<typeof useSessionSync>;
