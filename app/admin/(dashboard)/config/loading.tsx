export default function AdminConfigLoading() {
	return (
		<div className="space-y-8 animate-pulse">
			{/* Page heading skeleton */}
			<div className='space-y-1'>
				<div className='h-3 w-24 bg-slate-200 rounded' />
				<div className='h-7 w-52 bg-slate-200 rounded' />
				<div className='h-3 w-96 bg-slate-200 rounded mt-2' />
			</div>

			{/* Config section cards */}
			{[1, 2, 3].map((section) => (
				<div key={section} className='rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5'>
					{/* Section title */}
					<div className='flex items-center justify-between border-b border-slate-100 pb-4'>
						<div className='space-y-1.5'>
							<div className='h-5 w-40 bg-slate-200 rounded' />
							<div className='h-3 w-64 bg-slate-200 rounded' />
						</div>
						<div className='h-9 w-28 bg-slate-200 rounded-xl' />
					</div>

					{/* Config items */}
					<div className='space-y-3'>
						{[1, 2, 3, 4].map((item) => (
							<div key={item} className='flex items-center justify-between py-2'>
								<div className='flex items-center gap-3'>
									<div className='h-6 w-6 rounded-lg bg-slate-200' />
									<div className='h-3.5 w-32 bg-slate-200 rounded' />
								</div>
								<div className='h-6 w-16 bg-slate-200 rounded-full' />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
