import { redirect } from "next/navigation";
import { getCurrentMaster } from "@/repositories/master.repository";
import { AdminShell } from "@/components/layout/admin-shell";
import { MASTER_ACTOR } from "@/lib/write-actor";

export const dynamic = "force-dynamic";

/**
 * Guards /master/login's sibling routes: the share-link view
 * (/master/admin/[token]) and the bare /master path (which just redirects
 * to /admin — Master's real home). This still strictly requires a Master
 * session (not a Supabase Admin one) — that boundary is unchanged.
 *
 * The shell itself is the *same* AdminShell used at /admin, not a
 * lookalike, so a shared candidate profile looks identical to the real
 * admin page once Master has entered the passcode.
 */
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
	const master = await getCurrentMaster();
	if (!master) {
		redirect("/master/login");
	}

	return <AdminShell admin={MASTER_ACTOR} isMaster>{children}</AdminShell>;
}
