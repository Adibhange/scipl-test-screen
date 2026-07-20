"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { CandidateForm } from "@/components/candidate/candidate-form";
import { AlertCircle, X } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import { registerCandidate } from "@/services/candidate";
import { syncAssessmentSession } from "@/services/assessment";

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

	// Auto-dismiss the toast notification after 3 seconds for faster user experience
	useEffect(() => {
		if (submitError) {
			const timer = setTimeout(() => {
				setSubmitError(null);
			}, 3000);
			return () => clearTimeout(timer);
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

				{/* Floating Toast Alert */}
				{submitError && (
					<div className='fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-white/95 backdrop-blur-md border border-red-100 shadow-2xl rounded-2xl p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-150 ease-out'>
						<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100/50 shadow-xs shadow-red-50'>
							<AlertCircle className='h-4.5 w-4.5' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-xs font-bold text-slate-900 tracking-tight'>
								Registration Alert
							</p>
							<p className='text-[11px] font-semibold text-slate-500 mt-0.5 leading-snug break-words'>
								{submitError}
							</p>
						</div>
						<button
							type='button'
							onClick={() => setSubmitError(null)}
							className='text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors p-1 rounded-lg cursor-pointer'>
							<X className='h-3.5 w-3.5' />
						</button>
					</div>
				)}
			</main>
		</div>
	);
}
