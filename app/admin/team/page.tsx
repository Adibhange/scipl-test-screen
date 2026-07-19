import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { AdminUserManagement } from "@/components/admin/admin-user-management";
import { getCurrentAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
	const admin = await getCurrentAdmin();
	if (!admin) redirect("/admin/login");
	if (admin.role !== "hr") redirect("/admin");

	return (
		<AdminShell admin={admin}>
			<div className='max-w-6xl'>
				<div className='mt-2'>
					<AdminUserManagement currentAdmin={admin} />
				</div>
			</div>
		</AdminShell>
	);
}
