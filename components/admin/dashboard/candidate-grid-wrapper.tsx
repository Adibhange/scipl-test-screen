"use client";

import React from "react";
import { useUiStore } from "@/stores/ui.store";

export function CandidateGridWrapper({ children }: { children: React.ReactNode }) {
	const isSyncing = useUiStore((state) => state.isSyncing);

	return (
		<div className="relative min-h-[300px]">
			{isSyncing && (
				<div className="absolute inset-0 bg-slate-50/50 backdrop-blur-xs z-10 pointer-events-none transition-all duration-200">
					<div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 w-full opacity-60">
						{[1, 2, 3].map((i) => (
							<div key={i} className="min-h-80 border border-slate-200 bg-white rounded-2xl p-5 animate-pulse flex flex-col gap-4">
								<div className="flex items-center gap-3">
									<div className="h-11 w-11 rounded-full bg-slate-200" />
									<div className="flex-1 flex flex-col gap-2">
										<div className="h-4 w-1/3 bg-slate-200 rounded-sm" />
										<div className="h-3 w-1/4 bg-slate-200 rounded-sm" />
									</div>
								</div>
								<div className="h-32 bg-slate-100 rounded-xl" />
							</div>
						))}
					</div>
				</div>
			)}
			<div className={isSyncing ? "opacity-30 pointer-events-none transition-all duration-200" : "transition-all duration-200"}>
				{children}
			</div>
		</div>
	);
}
