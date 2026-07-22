"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import type { CandidateReferenceType } from "@/types";

export function ReferenceFormSection({
	references,
	onChange,
}: {
	references: CandidateReferenceType[];
	onChange: (refs: CandidateReferenceType[]) => void;
}) {
	const [hasReferences, setHasReferences] = useState(references.length > 0);

	useEffect(() => {
		if (!hasReferences && references.length > 0) {
			onChange([]);
		} else if (hasReferences && references.length === 0) {
			handleAddReference();
		}
	}, [hasReferences]);

	function handleAddReference() {
		const newItem: CandidateReferenceType = {
			referenceType: "INTERNAL",
			referenceName: "",
			referenceMobile: "",
			employeeCode: "",
			verifiedBy: "",
			notes: "",
		};
		onChange([...references, newItem]);
	}

	function handleItemChange(index: number, field: keyof CandidateReferenceType, value: any) {
		const list = [...references];
		(list[index] as any)[field] = value;
		if (field === "referenceType") {
			if (value === "EXTERNAL") {
				list[index].employeeCode = "";
				list[index].verifiedBy = "";
			}
		}
		onChange(list);
	}

	function handleRemove(index: number) {
		const list = references.filter((_, i) => i !== index);
		onChange(list);
		if (list.length === 0) {
			setHasReferences(false);
		}
	}

	return (
		<div className="space-y-4 border-t border-slate-100 pt-4">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-bold text-slate-700 flex items-center gap-2">
					<ShieldCheck className="h-4 w-4 text-slate-500" />
					Provide candidate references?
				</Label>
				<div className="flex gap-2 bg-slate-50 p-1 rounded-xl">
					<button
						type="button"
						onClick={() => setHasReferences(true)}
						className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							hasReferences
								? "bg-white text-indigo-650 shadow-sm"
								: "text-slate-500 hover:text-slate-700"
						}`}
					>
						Yes
					</button>
					<button
						type="button"
						onClick={() => setHasReferences(false)}
						className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							!hasReferences
								? "bg-white text-slate-700 shadow-sm"
								: "text-slate-500 hover:text-slate-700"
						}`}
					>
						No
					</button>
				</div>
			</div>

			{hasReferences && (
				<div className="space-y-4">
					{references.map((ref, index) => (
						<div key={index} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 relative space-y-3">
							<div className="flex justify-between items-center mb-1">
								<span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
									Reference #{index + 1}
								</span>
								{references.length > 1 && (
									<button
										type="button"
										onClick={() => handleRemove(index)}
										className="text-slate-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								)}
							</div>

							<div className="flex items-center gap-2.5 bg-slate-100 p-1.5 rounded-xl w-fit">
								<button
									type="button"
									onClick={() => handleItemChange(index, "referenceType", "INTERNAL")}
									className={`px-3.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
										ref.referenceType === "INTERNAL"
											? "bg-white text-indigo-650 shadow-sm"
											: "text-slate-500 hover:text-slate-700"
									}`}
								>
									Internal Employee
								</button>
								<button
									type="button"
									onClick={() => handleItemChange(index, "referenceType", "EXTERNAL")}
									className={`px-3.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
										ref.referenceType === "EXTERNAL"
											? "bg-white text-indigo-650 shadow-sm"
											: "text-slate-500 hover:text-slate-700"
									}`}
								>
									External Reference
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Contact Person Name</Label>
									<Input
										required
										value={ref.referenceName}
										onChange={(e) => handleItemChange(index, "referenceName", e.target.value)}
										placeholder="e.g. Rahul Sharma"
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Mobile Number</Label>
									<Input
										required
										value={ref.referenceMobile}
										onChange={(e) => handleItemChange(index, "referenceMobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
										placeholder="e.g. 9876543210"
										maxLength={10}
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
							</div>

							{ref.referenceType === "INTERNAL" && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
									<div className="space-y-1">
										<Label className="text-[11px] font-bold text-slate-500">Company Employee ID</Label>
										<Input
											required
											value={ref.employeeCode || ""}
											onChange={(e) => handleItemChange(index, "employeeCode", e.target.value)}
											placeholder="e.g. EMP1024"
											className="h-9 text-xs rounded-lg border-slate-200 bg-white"
										/>
									</div>
									<div className="space-y-1">
										<Label className="text-[11px] font-bold text-slate-500">Verified By (HR Person)</Label>
										<Input
											required
											value={ref.verifiedBy || ""}
											onChange={(e) => handleItemChange(index, "verifiedBy", e.target.value)}
											placeholder="e.g. HR Manager Name"
											className="h-9 text-xs rounded-lg border-slate-200 bg-white"
										/>
									</div>
								</div>
							)}

							<div className="space-y-1">
								<Label className="text-[11px] font-bold text-slate-500">Verification Notes / Remarks</Label>
								<Input
									value={ref.notes || ""}
									onChange={(e) => handleItemChange(index, "notes", e.target.value)}
									placeholder="e.g. Spoke to Rahul, confirmed John's designations."
									className="h-9 text-xs rounded-lg border-slate-200 bg-white"
								/>
							</div>
						</div>
					))}

					<Button
						type="button"
						onClick={handleAddReference}
						className="w-full h-9 bg-slate-50 hover:bg-slate-100 text-indigo-650 hover:text-indigo-700 border border-indigo-100 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Another Reference
					</Button>
				</div>
			)}
		</div>
	);
}
