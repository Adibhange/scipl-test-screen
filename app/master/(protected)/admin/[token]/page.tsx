import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
import { validateShareToken } from "@/repositories/candidate-share.repository";
import { getResultByCandidateId } from "@/repositories/result.repository";
import { getQuestionsByIds } from "@/repositories/question.repository";
import { getCandidateDocumentStatusMap } from "@/repositories/candidate-document.repository";
import { CandidateDetailWrapper } from "@/components/admin/candidates/candidate-detail-wrapper";
import CandidateDetailLoading from "@/app/admin/(dashboard)/[id]/loading";
import type { AdminUser } from "@/repositories/admin.repository";

export const dynamic = "force-dynamic";

/** Synthetic actor passed into the reused Admin candidate view. Master gets
 * unrestricted "hr"-equivalent edit rights (Feature 5) via this actor —
 * the underlying write endpoints authorize Master sessions separately
 * (see `lib/write-actor.ts`), so this is display-only, not a security boundary. */
const MASTER_VIEW_ACTOR: AdminUser = {
	userId: "master",
	email: "master@internal",
	name: "Master",
	role: "hr",
};

function ShareLinkExpiredNotice() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
				<ShieldAlert className="h-6 w-6 text-red-500" strokeWidth={1.8} />
			</div>
			<h1 className="mt-4 text-xl font-bold text-brand-navy">Share Link Expired</h1>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">
				This shared candidate link has expired or has been revoked.
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				Please request a new link from the administrator.
			</p>
		</div>
	);
}

export default async function MasterSharedCandidatePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	// Validates existence, active status, and expiry server-side. Never
	// distinguishes *why* a token failed to an unauthenticated caller — by
	// the time we get here the Master session is already confirmed by the
	// (protected) layout, but the token itself may still be stale.
	const share = await validateShareToken(token);
	if (!share) {
		return <ShareLinkExpiredNotice />;
	}

	return (
		<Suspense fallback={<CandidateDetailLoading />}>
			<SharedCandidateContent candidateId={share.candidateId} />
		</Suspense>
	);
}

async function SharedCandidateContent({ candidateId }: { candidateId: string }) {
	const result = await getResultByCandidateId(candidateId);
	if (!result) {
		return <ShareLinkExpiredNotice />;
	}

	const answerIds = result.answers.map((ans) => ans.questionId);
	const questions = await getQuestionsByIds(answerIds);

	const items = result.answers.map((answer) => ({
		answer,
		question: questions.find((q) => q.id === answer.questionId) ?? null,
	}));

	const documentStatus = result.candidate.id
		? await getCandidateDocumentStatusMap(result.candidate.id)
		: { resume: { uploaded: false, uploadedAt: null }, application_form: { uploaded: false, uploadedAt: null }, passport_photo: { uploaded: false, uploadedAt: null } };

	return <CandidateDetailWrapper result={result} items={items} admin={MASTER_VIEW_ACTOR} documentStatus={documentStatus} />;
}
