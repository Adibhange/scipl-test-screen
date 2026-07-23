import { notFound } from "next/navigation";
import { getResultById } from "@/repositories/result.repository";
import { getQuestionsByIds } from "@/repositories/question.repository";
import { getCandidateDocumentStatusMap } from "@/repositories/candidate-document.repository";
import { CandidateDetailWrapper } from "@/components/admin/candidates/candidate-detail-wrapper";
import { MASTER_ACTOR } from "@/lib/write-actor";
import { Suspense } from "react";
import CandidateDetailLoading from "@/app/admin/(dashboard)/[id]/loading";

export const dynamic = "force-dynamic";

/**
 * Master's own candidate detail route — reachable directly from the Master
 * dashboard grid, no share token required. This is distinct from
 * `/master/admin/[token]`, which is how an *Admin-generated share link* is
 * opened; Master's own browsing doesn't need one since Master already has
 * unrestricted access (Feature 5).
 */
export default async function MasterCandidatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	return (
		<Suspense fallback={<CandidateDetailLoading />}>
			<MasterCandidateContent params={params} />
		</Suspense>
	);
}

async function MasterCandidateContent({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const result = await getResultById(id);
	if (!result) notFound();

	const answerIds = result.answers.map((ans) => ans.questionId);
	const questions = await getQuestionsByIds(answerIds);

	const items = result.answers.map((answer) => ({
		answer,
		question: questions.find((q) => q.id === answer.questionId) ?? null,
	}));

	const documentStatus = result.candidate.id
		? await getCandidateDocumentStatusMap(result.candidate.id)
		: { resume: { uploaded: false, uploadedAt: null }, application_form: { uploaded: false, uploadedAt: null }, passport_photo: { uploaded: false, uploadedAt: null } };

	return (
		<CandidateDetailWrapper result={result} items={items} admin={MASTER_ACTOR} documentStatus={documentStatus} />
	);
}
