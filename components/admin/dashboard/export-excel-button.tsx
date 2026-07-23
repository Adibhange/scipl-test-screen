"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
	FileSpreadsheet, 
	ChevronDown, 
	Loader2
} from "lucide-react";
import type { CandidateResult } from "@/types";
import { exportToExcel } from "@/lib/export-to-excel";
import { toast } from "sonner";

interface MetadataOption {
	value: string;
	label: string;
}

interface VacancyOption {
	id: string;
	role: string;
	experience: string;
	hiring_location: string;
}

interface ExportExcelButtonProps {
	visibleResults: CandidateResult[];
	allResults: CandidateResult[];
	activeRoles: MetadataOption[];
	activeExperiences: MetadataOption[];
	activeTestLocations: MetadataOption[];
	activeHiringLocations: MetadataOption[];
	activeVacancies: VacancyOption[];
}

export function ExportExcelButton({
	visibleResults,
	allResults,
	activeRoles,
	activeExperiences,
	activeTestLocations,
	activeHiringLocations,
	activeVacancies,
}: ExportExcelButtonProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	async function handleExport(mode: "current" | "all") {
		const targets = mode === "current" ? visibleResults : allResults;

		if (targets.length === 0) {
			toast.error("No candidate records available to export in this mode.");
			return;
		}

		setIsExporting(true);

		const exportPromise = (async () => {
			try {
				// Delay slightly to yield execution loop and let UI render loading state
				await new Promise((resolve) => setTimeout(resolve, 300));

				await exportToExcel({
					results: targets,
					activeRoles,
					activeExperiences,
					activeTestLocations,
					activeHiringLocations,
					activeVacancies,
				});
				return targets.length;
			} finally {
				setIsExporting(false);
			}
		})();

		toast.promise(exportPromise, {
			loading: "Preparing Excel export...",
			success: (count: number) => `Excel exported successfully containing ${count} records.`,
			error: (err: unknown) => {
				console.error("Failed to generate Excel sheet:", err);
				return err instanceof Error ? err.message : "Unable to export candidate data.";
			}
		});
	}

	return (
		<div className="relative inline-block text-left">
			<Button
				variant="outline"
				disabled={isExporting}
				onClick={() => setMenuOpen(!menuOpen)}
				className="h-10 rounded-xl flex items-center gap-2 border-slate-200 hover:bg-slate-50 cursor-pointer select-none"
			>
				{isExporting ? (
					<Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
				) : (
					<FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
				)}
				<span className="font-semibold text-xs text-slate-700">Export Excel</span>
				<ChevronDown className="h-3.5 w-3.5 text-slate-400" />
			</Button>

			{menuOpen && (
				<>
					{/* Backdrop for click outside dismiss */}
					<div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
					
					<div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-100 origin-top-right">
						<button
							onClick={() => {
								setMenuOpen(false);
								handleExport("current");
							}}
							className="w-full text-left rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 focus:outline-none focus:bg-slate-50 cursor-pointer"
						>
							<span className="text-xs font-bold text-slate-800">Export Current View</span>
							<span className="text-[10px] text-slate-400 font-semibold leading-normal">
								Exports only the filtered records currently visible in the grid ({visibleResults.length} candidates)
							</span>
						</button>
						
						<div className="my-1 h-px bg-slate-100" />

						<button
							onClick={() => {
								setMenuOpen(false);
								handleExport("all");
							}}
							className="w-full text-left rounded-xl p-2.5 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 focus:outline-none focus:bg-slate-50 cursor-pointer"
						>
							<span className="text-xs font-bold text-slate-800">Export All Records</span>
							<span className="text-[10px] text-slate-400 font-semibold leading-normal">
								Exports every candidate record you have permission to access ({allResults.length} candidates)
							</span>
						</button>
					</div>
				</>
			)}
		</div>
	);
}
