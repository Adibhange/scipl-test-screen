import { redirect } from "next/navigation";
import { getCurrentMaster } from "@/repositories/master.repository";
import { MasterShell } from "@/components/master/master-shell";

export const dynamic = "force-dynamic";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
	const master = await getCurrentMaster();
	if (!master) {
		redirect("/master/login");
	}

	return <MasterShell>{children}</MasterShell>;
}
