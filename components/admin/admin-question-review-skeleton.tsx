import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminQuestionReviewSkeleton() {
	return (
		<div className='space-y-6 py-4 animate-pulse'>
			{/* Back button skeleton */}
			<div className='flex items-center gap-1.5 text-xs font-semibold text-slate-400'>
				<ArrowLeft className='h-3.5 w-3.5' /> Back to candidate details
			</div>

			{/* Evaluation breakdown skeleton */}
			<div className='overflow-hidden rounded-lg border bg-card'>
				<div className='h-1.5 w-full bg-slate-200' />
				<div className='p-5 space-y-4'>
					<div className='flex items-center justify-between'>
						<div className='space-y-2'>
							<div className='h-4 w-40 bg-slate-200 rounded' />
							<div className='h-3 w-64 bg-slate-200 rounded' />
						</div>
					</div>
					<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className='rounded-md border border-slate-100 bg-slate-50 px-3 py-2 space-y-2'>
								<div className='h-3 w-16 bg-slate-200 rounded' />
								<div className='h-4.5 w-10 bg-slate-200 rounded' />
							</div>
						))}
					</div>
					<div className='h-4 w-80 bg-slate-200 rounded pt-1' />
				</div>
			</div>

			{/* Main content grid */}
			<div className='grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start'>
				{/* Left Navigator skeleton */}
				<div className='rounded-lg border bg-card p-4 space-y-4'>
					<div className='h-3.5 w-24 bg-slate-200 rounded' />
					<div className='grid grid-cols-4 gap-2'>
						{Array.from({ length: 12 }).map((_, idx) => (
							<div
								key={idx}
								className='h-10 w-full bg-slate-200 rounded-lg'
							/>
						))}
					</div>
				</div>

				{/* Right Active Question panel skeleton */}
				<div className='rounded-lg border bg-card p-5 space-y-5'>
					<div className='flex items-center justify-between border-b pb-4'>
						<div className='space-y-2'>
							<div className='h-5 w-48 bg-slate-200 rounded' />
							<div className='h-3.5 w-28 bg-slate-200 rounded' />
						</div>
					</div>

					<div className='space-y-2'>
						<div className='h-4 w-full bg-slate-200 rounded' />
						<div className='h-4 w-5/6 bg-slate-200 rounded' />
						<div className='h-4 w-4/5 bg-slate-200 rounded' />
					</div>

					<div className='rounded-lg border border-slate-250 bg-slate-50 p-4 min-h-64 space-y-3'>
						<div className='h-3.5 w-32 bg-slate-200 rounded' />
						<div className='h-4 w-full bg-slate-200 rounded' />
						<div className='h-4 w-5/6 bg-slate-200 rounded' />
					</div>
				</div>
			</div>
		</div>
	);
}
