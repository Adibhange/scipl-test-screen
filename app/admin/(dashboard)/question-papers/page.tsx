import { redirect } from "next/navigation";
import { resolveWriteActor } from "@/lib/write-actor";
import { QuestionPapersPage } from "@/components/admin/question-papers/question-papers-page";
import { PageContainer } from "@/components/ui/layout-primitives";

export const dynamic = "force-dynamic";

export default async function QuestionPapersPageRoute() {
	const actor = await resolveWriteActor();
	if (!actor) redirect("/admin/login");
	// Directors are denied server-side
	if (actor.role === "director") redirect("/admin");

	return (
		<PageContainer>
			<QuestionPapersPage actor={{ userId: actor.userId, name: actor.name, role: actor.role }} />
		</PageContainer>
	);
}
