import { ArrowLeft } from "lucide-react";

export default function CandidateDetailLoading() {
	return (
		<div className='min-h-screen bg-slate-50 text-slate-900 animate-pulse'>
			{/* Sidebar Placeholder */}
			<aside className='fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex'>
				<div className='flex h-20 items-center gap-3 border-b border-slate-100 px-6'>
					<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-white shadow-lg' />
					<div className='space-y-1.5'>
						<div className='h-3.5 w-16 bg-slate-200 rounded' />
						<div className='h-2.5 w-24 bg-slate-200 rounded' />
					</div>
				</div>
				<div className='flex-1 space-y-3 p-4'>
					{[1, 2, 3].map((i) => (
						<div key={i} className='flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-100 h-10 w-full' />
					))}
				</div>
			</aside>

			{/* Main Layout Area */}
			<div className='lg:pl-64'>
				{/* Header Placeholder */}
				<header className='sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8'>
					<div className='space-y-2'>
						<div className='h-4 w-48 bg-slate-200 rounded' />
						<div className='h-3.5 w-32 bg-slate-200 rounded-full' />
					</div>
					<div className='flex items-center gap-3'>
						<div className='hidden text-right sm:block space-y-1'>
							<div className='h-3 w-20 bg-slate-200 rounded' />
							<div className='h-2.5 w-12 bg-slate-200 rounded ml-auto' />
						</div>
						<div className='h-9 w-9 rounded-full bg-slate-200' />
					</div>
				</header>

				{/* Main Content Area */}
				<main className='mx-auto w-full max-w-6xl p-5 lg:p-8 space-y-6'>
					{/* Navigation / Actions Bar Skeleton */}
					<div className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4'>
						<div className='h-5 w-48 bg-slate-200 rounded' />
						<div className='h-10 w-48 bg-slate-200 rounded-xl' />
					</div>

					{/* Candidate Profile Card Skeleton */}
					<section className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
						<div className='h-2 w-full bg-slate-200' />
						<div className='p-6 sm:p-8 space-y-6'>
							<div className='flex flex-col justify-between gap-5 md:flex-row md:items-start'>
								<div className='flex flex-col sm:flex-row sm:items-center gap-4'>
									<div className='h-14 w-14 rounded-2xl bg-slate-200 shrink-0' />
									<div className='space-y-2'>
										<div className='h-4.5 w-24 bg-slate-200 rounded-full' />
										<div className='h-7 w-56 bg-slate-200 rounded' />
										<div className='flex gap-4'>
											<div className='h-3.5 w-36 bg-slate-200 rounded' />
											<div className='h-3.5 w-28 bg-slate-200 rounded' />
										</div>
									</div>
								</div>
								<div className='h-9 w-20 bg-slate-200 rounded-xl' />
							</div>

							{/* Key metadata grid skeleton */}
							<div className='grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-5'>
								{[1, 2, 3, 4, 5].map((i) => (
									<div key={i} className='rounded-xl border border-slate-100 bg-slate-50/50 p-4 flex items-start gap-3'>
										<div className='h-8 w-8 rounded-lg bg-slate-200 shrink-0' />
										<div className='space-y-1.5 flex-1'>
											<div className='h-2.5 w-10 bg-slate-200 rounded' />
											<div className='h-3.5 w-20 bg-slate-200 rounded' />
										</div>
									</div>
								))}
							</div>

							{/* Interview round cards skeleton */}
							<div className='grid gap-4 sm:grid-cols-3 border-t border-slate-100 pt-6'>
								{[1, 2, 3].map((i) => (
									<div key={i} className='rounded-2xl p-5 border border-slate-200 bg-white space-y-3'>
										<div className='h-3 w-32 bg-slate-200 rounded' />
										<div className='flex justify-between items-center'>
											<div className='h-4.5 w-16 bg-slate-200 rounded' />
											<div className='h-2 w-2 rounded-full bg-slate-200' />
										</div>
										<div className='space-y-1.5 pt-2'>
											<div className='h-3 w-full bg-slate-200 rounded' />
											<div className='h-3 w-5/6 bg-slate-200 rounded' />
										</div>
									</div>
								))}
							</div>
						</div>
					</section>

					{/* Interview Round Panel Skeleton */}
					<div className='space-y-4'>
						<div className='rounded-xl border bg-white p-5 space-y-3'>
							<div className='h-4 w-36 bg-slate-200 rounded' />
							<div className='grid gap-2 sm:grid-cols-3 pt-1'>
								<div className='h-3.5 w-40 bg-slate-200 rounded' />
								<div className='h-3.5 w-44 bg-slate-200 rounded' />
								<div className='h-3.5 w-32 bg-slate-200 rounded' />
							</div>
						</div>
						<div className='rounded-xl border bg-white p-5 space-y-4'>
							<div className='h-4 w-28 bg-slate-200 rounded' />
							<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
								<div className='h-10 bg-slate-200 rounded-xl' />
								<div className='h-10 bg-slate-200 rounded-xl' />
								<div className='h-10 bg-slate-200 rounded-xl' />
								<div className='h-10 bg-slate-200 rounded-xl' />
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
