import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listActiveShares } from "@/repositories/candidate-share.repository";
import { MasterSharedLinksList } from "@/components/master/master-shared-links-list";
import { CandidateDashboard, type CandidateDashboardSearchParams } from "@/components/admin/dashboard/candidate-dashboard";
import { MASTER_ACTOR } from "@/lib/write-actor";

export const dynamic = "force-dynamic";

export default async function MasterDashboardPage({
	searchParams,
}: {
	searchParams: Promise<CandidateDashboardSearchParams>;
}) {
	const activeShares = await listActiveShares();

	return (
		<div className="space-y-6">
			<CandidateDashboard searchParams={searchParams} admin={MASTER_ACTOR} basePath="/master/candidates" />

			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Link2 className="h-4 w-4 text-brand-navy" strokeWidth={1.8} />
							Shared Candidate Links
						</CardTitle>
					</CardHeader>
					<CardContent>
						<MasterSharedLinksList shares={activeShares} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
