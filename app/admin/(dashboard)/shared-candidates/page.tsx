import { redirect } from "next/navigation";
import { resolveWriteActor } from "@/lib/write-actor";
import { listActiveShares } from "@/repositories/candidate-share.repository";
import { SharedCandidatesTable } from "@/components/admin/dashboard/shared-candidates-table";
import { PageContainer, PageHeader } from "@/components/ui/layout-primitives";

export const dynamic = "force-dynamic";

export default async function SharedCandidatesPage() {
	const admin = await resolveWriteActor();
	if (!admin) redirect("/admin/login");

	const shares = await listActiveShares();

	return (
		<PageContainer>
			<PageHeader
				title="Shared Candidates"
				description="Active candidate share links. Revoke, copy, or act on multiple candidates at once."
			/>
			<div className="mt-6">
				<SharedCandidatesTable shares={shares} />
			</div>
		</PageContainer>
	);
}
