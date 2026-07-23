import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { resolveWriteActor } from "@/lib/write-actor";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const admin = await resolveWriteActor();
	if (!admin) {
		redirect("/admin/login");
	}

	return <AdminShell admin={admin} isMaster={admin.isMaster}>{children}</AdminShell>;
}
