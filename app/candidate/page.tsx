"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { CandidateForm } from "@/components/candidate/candidate-form";
import type { Candidate } from "@/types/candidate";
import { registerCandidate } from "@/services/client/candidate.service";
import { syncAssessmentSession } from "@/services/client/assessment.service";
import { toast } from "sonner";

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

export default function CandidateRegistrationPage() {
	const router = useRouter();
	const candidate = useSyncExternalStore(
		subscribeToCandidate,
		getStoredCandidate,
		() => null,
	);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Auto-redirect if they try to navigate back to registration with an active exam session
	useEffect(() => {
		if (!mounted) return;
		const storedCandidate = sessionStorage.getItem("candidate");
		const storedToken = sessionStorage.getItem("sessionToken");
		if (storedCandidate && storedToken) {
			try {
				const cand = JSON.parse(storedCandidate);
				if (cand && cand.id) {
					syncAssessmentSession({
						candidateId: cand.id,
						candidateEmail: cand.email,
						role: cand.role,
						experience: cand.experience,
						sessionToken: storedToken,
					})
						.then((session) => {
							if (session.status === "active" || session.status === "idle") {
								if (session.sessionToken === storedToken) {
									router.replace("/interview");
								}
							}
						})
						.catch(() => {});
				}
			} catch {}
		}
	}, [router, mounted]);

	// Trigger Sonner toast whenever a validation/submission error occurs
	useEffect(() => {
		if (submitError) {
			toast.error(submitError);
		}
	}, [submitError]);

	async function handleSubmit(data: Candidate) {
		setSubmitError(null);
		setIsSubmitting(true);

		const firstName = data.name.split(" ")[0] || "";
		const lastName = data.name.split(" ").slice(1).join(" ") || "";

		try {
			const payload = await registerCandidate({
				firstName,
				lastName,
				mobile: data.mobile,
				email: data.email,
				vacancyId: data.vacancyId,
				testLocation: data.testLocation,
			});

			sessionStorage.removeItem("assessment-attempt");
			sessionStorage.setItem("candidate", JSON.stringify(payload));
			if (payload.active_session_token) {
				sessionStorage.setItem("sessionToken", payload.active_session_token);
			}
			router.push("/interview");
		} catch (error: any) {
			setSubmitError(
				error instanceof Error ?
					error.message
				:	"Could not save candidate information.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className='min-h-screen flex flex-col bg-slate-50'>
			<SiteHeader />
			<main className='flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex items-center justify-center relative animate-in fade-in duration-300'>
				<CandidateForm
					onSubmit={handleSubmit}
					onSubmitError={setSubmitError}
					isSubmitting={isSubmitting}
					submitError={submitError}
				/>
			</main>
		</div>
	);
}
