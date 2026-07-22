import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getCurrentAdmin } from "@/repositories/admin.repository";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const admin = await getCurrentAdmin();
	if (!admin) {
		redirect("/admin/login");
	}

	return <AdminShell admin={admin}>{children}</AdminShell>;
}
