import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminLoading from "./loading";
import { CandidateDashboard, type CandidateDashboardSearchParams } from "@/components/admin/dashboard/candidate-dashboard";
import { resolveWriteActor, type WriteActor } from "@/lib/write-actor";

export const dynamic = "force-dynamic";

export default async function AdminPage({
	searchParams,
}: {
	searchParams: Promise<CandidateDashboardSearchParams>;
}) {
	const admin = await resolveWriteActor();
	if (!admin) redirect("/admin/login");

	return (
		<Suspense fallback={<AdminLoading />}>
			<AdminDashboardContent searchParams={searchParams} admin={admin} />
		</Suspense>
	);
}

async function AdminDashboardContent({
	searchParams,
	admin,
}: {
	searchParams: Promise<CandidateDashboardSearchParams>;
	admin: WriteActor;
}) {
	return <CandidateDashboard searchParams={searchParams} admin={admin} basePath="/admin" />;
}
