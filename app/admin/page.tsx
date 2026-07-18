import Link from "next/link";
import { getAllResults } from "@/lib/results";
import { SiteHeader } from "@/components/layout/site-header";
import { ResultsFilterBar } from "@/components/admin/results-filter-bar";
import { ROLES } from "@/data/roles";
import {
	AlertTriangle,
	ChevronRight,
	Mail,
	Phone,
	BriefcaseBusiness,
	CalendarDays,
} from "lucide-react";

export default async function AdminPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string; role?: string }>;
}) {
	const results = getAllResults().reverse();
	const { status = "completed", role = "all" } = await searchParams;
	const pendingResults = results.filter(
		(result) => result.totalMarksAwarded === undefined,
	);
	const evaluatedResults = results.filter(
		(result) => result.totalMarksAwarded !== undefined,
	);
	const statusResults =
		status === "pending" ? pendingResults
		: status === "evaluated" ? evaluatedResults
		: results;
	const visibleResults =
		role === "all" ? statusResults
		: statusResults.filter((result) => result.candidate.role === role);

	return (
		<div
			className='min-h-screen bg-background text-foreground'
			style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
			<SiteHeader />

			<main className='mx-auto max-w-7xl px-6 py-10'>
				<div className='mb-7 flex items-center justify-between'>
					<div>
						<p className='text-xs font-semibold uppercase tracking-[0.25em] text-primary'>
							Assessment intake
						</p>
						<h1 className='mt-2 text-2xl font-bold'>
							Candidate Results
							<span className='ml-2 text-base font-normal text-muted-foreground'>
								({visibleResults.length})
							</span>
						</h1>
					</div>
				</div>

				<ResultsFilterBar
					status={status}
					role={role}
					statusCounts={{
						completed: results.length,
						pending: pendingResults.length,
						evaluated: evaluatedResults.length,
					}}
					roleCounts={Object.fromEntries([
						["all", statusResults.length],
						...ROLES.map((role) => [
							role.value,
							statusResults.filter(
								(result) => result.candidate.role === role.value,
							).length,
						]),
					])}
				/>

				{visibleResults.length === 0 && (
					<div className='rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm'>
						<p className='text-sm text-muted-foreground'>No results in this view.</p>
					</div>
				)}

				<div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					{visibleResults.map((r) => {
						const gradable = r.answers.filter((a) => a.isCorrect !== undefined);
						const correctCount = gradable.filter((a) => a.isCorrect).length;
						const scorePct =
							gradable.length ? correctCount / gradable.length : null;
						const initials =
							r.candidate.name
								.split(" ")
								.filter(Boolean)
								.slice(0, 2)
								.map((name) => name[0])
								.join("")
								.toUpperCase() || "—";

						return (
							<Link
								key={r.id}
								href={`/admin/${r.id}`}
								className='group block h-full capitalize'>
								<article className='flex aspect-square h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md'>
									<div className='h-1.5 w-full bg-[#4F46E5]' />

									<div className='flex flex-1 flex-col p-5'>
										<div className='flex items-start justify-between gap-3'>
											<div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
												{initials}
											</div>
											{r.tabSwitches > 0 && (
												<span className='flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive'>
													<AlertTriangle
														className='h-3 w-3'
														strokeWidth={1.5}
													/>
													{r.tabSwitches}
												</span>
											)}
										</div>
										<div className='mt-4 min-w-0'>
											<p className='truncate text-base font-semibold text-foreground'>
												{r.candidate.name}
											</p>
											<p className='mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
												<Mail className='h-3.5 w-3.5 shrink-0' />
												{r.candidate.email}
											</p>
											<p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
												<Phone className='h-3.5 w-3.5 shrink-0' />
												{r.candidate.mobile}
											</p>
										</div>

										<div className='mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground'>
											<p className='flex items-center gap-2'>
												<BriefcaseBusiness className='h-3.5 w-3.5 shrink-0 text-primary' />
												<span className='truncate'>
													{r.candidate.role} · {r.candidate.experience} yrs
												</span>
											</p>
											<p className='flex items-center gap-2'>
												<CalendarDays className='h-3.5 w-3.5 shrink-0 text-primary' />
												{new Date(r.submittedAt).toLocaleDateString()}
											</p>
										</div>

										<div className='mt-auto flex items-center justify-between pt-4'>
											{r.totalMarksAwarded !== undefined ?
												<span className='rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary'>
													Total: {r.totalMarksAwarded}/{r.totalMarksPossible}
												</span>
											: gradable.length > 0 ?
												<span
													className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
														scorePct !== null && scorePct >= 0.6 ?
															"border-green-500/20 bg-green-500/10 text-green-600"
														:	"border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
													}`}>
													Score: {correctCount}/{gradable.length}
												</span>
											:	<span className='text-xs text-muted-foreground'>
													View submission
												</span>
											}
											<ChevronRight className='h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary' />
										</div>
									</div>
								</article>
							</Link>
						);
					})}
				</div>
			</main>
		</div>
	);
}
