import { notFound } from "next/navigation";
import { getResultById } from "@/repositories/result.repository";
import { getQuestionsByIds } from "@/repositories/question.repository";
import { getCandidateDocumentStatusMap } from "@/repositories/candidate-document.repository";
import { CandidateDetailWrapper } from "@/components/admin/candidates/candidate-detail-wrapper";
import { getCurrentAdmin, type AdminUser } from "@/repositories/admin.repository";
import { Suspense } from "react";
import CandidateDetailLoading from "./loading";

export const dynamic = "force-dynamic";

export default async function CandidateResultPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const admin = await getCurrentAdmin();
	if (!admin) notFound();

	return (
		<Suspense fallback={<CandidateDetailLoading />}>
			<CandidateResultContent params={params} admin={admin} />
		</Suspense>
	);
}

async function CandidateResultContent({
	params,
	admin,
}: {
	params: Promise<{ id: string }>;
	admin: AdminUser;
}) {
	const { id } = await params;
	const result = await getResultById(id);

	if (!result) notFound();

	// Fetch only the specific questions answered by this candidate for optimal performance
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
		<CandidateDetailWrapper result={result} items={items} admin={admin} documentStatus={documentStatus} />
	);
}
