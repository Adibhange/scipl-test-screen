import { notFound } from "next/navigation";
import { getResultById } from "@/lib/results";
import { getAllQuestions } from "@/lib/questions";
import { CandidateDetailWrapper } from "@/components/admin/candidate-detail-wrapper";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/layout/admin-shell";

export const dynamic = "force-dynamic";

export default async function CandidateResultPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const result = await getResultById(id);

	if (!result) notFound();
	const admin = await getCurrentAdmin();
	if (!admin) notFound();

	const allQuestions = await getAllQuestions();
	const items = result.answers.map((answer) => ({
		answer,
		question: allQuestions.find((q) => q.id === answer.questionId) ?? null,
	}));

	return (
		<AdminShell admin={admin}>
			<CandidateDetailWrapper result={result} items={items} admin={admin} />
		</AdminShell>
	);
}

