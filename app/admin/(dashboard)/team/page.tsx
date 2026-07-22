import { redirect } from "next/navigation";
import { AdminUserManagement } from "@/components/admin/users/admin-user-management";
import { getCurrentAdmin } from "@/repositories/admin.repository";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
	const admin = await getCurrentAdmin();
	if (!admin) redirect("/admin/login");
	if (admin.role !== "hr") redirect("/admin");

	return (
		<div className='max-w-6xl'>
			<div className='mt-2'>
				<AdminUserManagement currentAdmin={admin} />
			</div>
		</div>
	);
}
