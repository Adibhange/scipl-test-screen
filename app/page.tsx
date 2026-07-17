"use client";

import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { CandidateForm } from "@/components/candidates/candidate-form";
import type { Candidate } from "@/types";

export default function HomePage() {
	const router = useRouter();

	function handleSubmit(data: Candidate) {
		sessionStorage.setItem("candidate", JSON.stringify(data));
		router.push("/interview");
	}

	return (
		<>
			<SiteHeader />
			<main className='max-w-7xl mx-auto px-6 py-16 space-y-6'>
				<CandidateForm onSubmit={handleSubmit} />
			</main>
		</>
	);
}
