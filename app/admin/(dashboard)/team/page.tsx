import { redirect } from "next/navigation";
import { AdminUserManagement } from "@/components/admin/users/admin-user-management";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { PageContainer } from "@/components/ui/layout-primitives";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
	const admin = await getCurrentAdmin();
	if (!admin) redirect("/admin/login");
	if (admin.role !== "hr") redirect("/admin");

	return (
		<PageContainer>
			<AdminUserManagement currentAdmin={admin} />
		</PageContainer>
	);
}
