"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { CandidateForm } from "@/components/candidates/candidate-form";
import type { Candidate } from "@/types";

export default function HomePage() {
	const router = useRouter();
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(data: Candidate) {
		setSubmitError(null);
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/candidates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? "Could not save candidate information.");

			sessionStorage.setItem("candidate", JSON.stringify(payload));
			router.push("/interview");
		} catch (error) {
			setSubmitError(error instanceof Error ? error.message : "Could not save candidate information.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<SiteHeader />
			<main className='max-w-7xl mx-auto px-6 py-16 space-y-6'>
				<CandidateForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitError={submitError} />
			</main>
		</>
	);
}
