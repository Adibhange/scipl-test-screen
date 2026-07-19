import { useEffect, useState } from "react";
import type { Candidate } from "@/types/candidate";
import type { Question } from "@/types/metadata";
import { syncAssessmentSession, fetchAssessmentQuestions } from "@/services/assessment";

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
	const [blockReason, setBlockReason] = useState<"conflict" | "submitted" | "expired" | null>(null);

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
			setLoading(false);
			return;
		}

		const runSync = async () => {
			try {
				const storedToken = sessionStorage.getItem("sessionToken");
				const data = await syncAssessmentSession({
					candidateId: candidate.id!,
					candidateEmail: candidate.email,
					role: candidate.role,
					experience: candidate.experience,
					sessionToken: storedToken,
				});

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

				const qs = await fetchAssessmentQuestions(candidate.role, candidate.experience);
				setQuestions(qs);
			} catch (err: any) {
				if (err.message === "conflict") {
					setBlockReason("conflict");
				} else if (err.message === "Application Process Terminated") {
					setBlockReason("terminated" as any);
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
