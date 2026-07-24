"use client";

import { useState } from "react";
import { calculateResultScore } from "@/services/client/result.service";
import { useRouter } from "next/navigation";
import type { CandidateResult } from "@/types";
import { Calculator, Lock } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function CalculateResultsButton({
	resultId,
	tabSwitches,
	disabled = false,
	isFinalized = false,
	onCalculate,
}: {
	resultId: string;
	tabSwitches: number;
	disabled?: boolean;
	isFinalized?: boolean;
	onCalculate?: (updatedResult: CandidateResult) => void;
}) {
	const [calculating, setCalculating] = useState(false);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const deduction = tabSwitches * 10;

	async function handleClick() {
		setCalculating(true);
		try {
			const updatedResult = await calculateResultScore(resultId);
			setOpen(false);
			if (onCalculate) {
				onCalculate(updatedResult);
			} else {
				router.push("/admin");
			}
		} finally {
			setCalculating(false);
		}
	}

	const showLock = disabled || isFinalized;

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}>
			<button
				onClick={() => !showLock && setOpen(true)}
				disabled={calculating || showLock}
				className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'>
				{showLock ?
					<Lock
						className='h-3.5 w-3.5'
						strokeWidth={1.5}
					/>
				:	<Calculator
						className='h-3.5 w-3.5'
						strokeWidth={1.5}
					/>
				}
				{isFinalized ? "Finalized" : "Calculate results"}
			</button>
			{!showLock && (
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm final evaluation</DialogTitle>
						<DialogDescription>
							{tabSwitches > 0 ?
								`The candidate changed tabs ${tabSwitches} time${tabSwitches === 1 ? "" : "s"}. A penalty of 10 marks per switch will deduct ${deduction} marks from the score.`
							:	"No tab switches were recorded. No integrity penalty will be applied."
							}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<button
							type='button'
							onClick={() => setOpen(false)}
							className='rounded-lg border px-4 py-2 text-xs font-medium'>
							Cancel
						</button>
						<button
							type='button'
							onClick={handleClick}
							disabled={calculating}
							className='rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white disabled:opacity-50'>
							{calculating ? "Calculating…" : "Apply penalty & calculate"}
						</button>
					</DialogFooter>
				</DialogContent>
			)}
		</Dialog>
	);
}
