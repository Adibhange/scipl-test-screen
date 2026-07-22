import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/repositories/admin.repository";
import { SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
	const admin = await getCurrentAdmin();
	if (!admin) redirect("/admin/login");
	return (
		<section className='max-w-3xl'>
			<p className='text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600'>
				Workspace
			</p>
			<h2 className='mt-2 text-3xl font-bold tracking-tight'>Settings</h2>
			<p className='mt-2 text-sm text-slate-500'>
				System preferences and assessment configuration will appear here.
			</p>
			<div className='mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
				<div className='mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600'>
					<SlidersHorizontal className='h-5 w-5' />
				</div>
				<p className='mt-4 font-semibold'>Workspace settings</p>
				<p className='mt-1 text-sm text-slate-500'>
					This area is ready for future assessment and notification settings.
				</p>
			</div>
		</section>
	);
}
