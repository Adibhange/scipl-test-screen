import { redirect } from "next/navigation";
import { resolveWriteActor } from "@/lib/write-actor";
import { SlidersHorizontal } from "lucide-react";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/layout-primitives";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
	const admin = await resolveWriteActor();
	if (!admin) redirect("/admin/login");

	return (
		<PageContainer className="max-w-4xl">
			<div className="space-y-6 animate-fade-in">
				<PageHeader
					title="Workspace Settings"
					description="Configure global system preferences, integrations, and workspace parameters."
				/>

				<div className="py-8">
					<EmptyState
						title="Workspace settings under construction"
						description="This area is configured and ready for future assessment rules, notification settings, and team authorization variables."
						icon={SlidersHorizontal}
					/>
				</div>
			</div>
		</PageContainer>
	);
}
