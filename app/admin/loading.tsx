import { Clock } from "lucide-react";

export default function AdminLoading() {
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
				<main className='mx-auto w-full max-w-[1600px] p-5 lg:p-8 space-y-8'>
					{/* Metrics Cards Skeleton */}
					<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3'>
								<div className='flex items-start justify-between'>
									<div className='space-y-2'>
										<div className='h-3 w-24 bg-slate-200 rounded' />
										<div className='h-7 w-12 bg-slate-200 rounded' />
									</div>
									<div className='h-10 w-10 rounded-xl bg-slate-200' />
								</div>
								<div className='h-3 w-36 bg-slate-200 rounded' />
							</div>
						))}
					</div>

					{/* Heading Section Skeleton */}
					<div className='flex items-center justify-between'>
						<div className='space-y-2'>
							<div className='h-2.5 w-28 bg-slate-200 rounded' />
							<div className='h-6 w-48 bg-slate-200 rounded' />
						</div>
						<div className='h-10 w-32 bg-slate-200 rounded-xl' />
					</div>

					{/* Filter Bar Skeleton */}
					<div className='h-12 w-full bg-slate-200 rounded-xl border border-slate-100 bg-slate-100/50' />

					{/* Candidate Cards Grid Skeleton */}
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div key={i} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-h-80 space-y-5'>
								<div className='flex items-start justify-between'>
									<div className='h-11 w-11 rounded-full bg-slate-200' />
									<div className='h-5 w-16 bg-slate-200 rounded-full' />
								</div>
								<div className='space-y-2'>
									<div className='h-4 w-32 bg-slate-200 rounded' />
									<div className='h-3 w-48 bg-slate-200 rounded' />
									<div className='h-3 w-40 bg-slate-200 rounded' />
								</div>
								<div className='border-t border-slate-100 pt-4 space-y-2'>
									<div className='h-3.5 w-44 bg-slate-200 rounded' />
									<div className='h-3.5 w-52 bg-slate-200 rounded' />
									<div className='h-3.5 w-36 bg-slate-200 rounded' />
								</div>
								<div className='mt-auto pt-4 flex items-center justify-between border-t border-slate-100'>
									<div className='h-5 w-20 bg-slate-200 rounded-full' />
									<div className='h-5 w-24 bg-slate-200 rounded-full' />
								</div>
							</div>
						))}
					</div>
				</main>
			</div>
		</div>
	);
}
