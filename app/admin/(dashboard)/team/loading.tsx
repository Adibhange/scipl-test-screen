export default function AdminTeamLoading() {
	return (
		<div className="space-y-6 animate-pulse">
			{/* Page heading skeleton */}
			<div className='space-y-1'>
				<div className='h-3 w-24 bg-slate-200 rounded' />
				<div className='h-7 w-48 bg-slate-200 rounded' />
			</div>

			{/* Action bar skeleton */}
			<div className='flex items-center justify-between'>
				<div className='h-9 w-56 bg-slate-200 rounded-lg' />
				<div className='h-10 w-36 bg-slate-200 rounded-xl' />
			</div>

			{/* Table skeleton */}
			<div className='rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
				{/* Table header */}
				<div className='flex items-center gap-4 px-5 py-4 border-b border-slate-100'>
					{[140, 200, 120, 100, 80].map((w, i) => (
						<div key={i} className={`h-3 bg-slate-200 rounded`} style={{ width: w }} />
					))}
				</div>
				{/* Table rows */}
				{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
					<div key={i} className='flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0'>
						<div className='h-8 w-8 rounded-full bg-slate-200 shrink-0' />
						<div className='h-3.5 w-36 bg-slate-200 rounded' />
						<div className='h-3.5 w-48 bg-slate-200 rounded' />
						<div className='h-5 w-20 bg-slate-200 rounded-full ml-auto' />
						<div className='h-8 w-8 bg-slate-200 rounded-lg' />
					</div>
				))}
			</div>
		</div>
	);
}
