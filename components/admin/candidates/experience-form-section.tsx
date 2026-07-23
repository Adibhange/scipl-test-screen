/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Briefcase } from "lucide-react";
import type { CandidateExperienceType } from "@/types";

export function ExperienceFormSection({
	experiences,
	onChange,
}: {
	experiences: CandidateExperienceType[];
	onChange: (exps: CandidateExperienceType[]) => void;
}) {
	const [hasExperience, setHasExperience] = useState(experiences.length > 0);

	useEffect(() => {
		if (!hasExperience && experiences.length > 0) {
			onChange([]);
		} else if (hasExperience && experiences.length === 0) {
			handleAddExperience();
		}
	}, [hasExperience]);

	function handleAddExperience() {
		const newItem: CandidateExperienceType = {
			companyName: "",
			designation: "",
			joiningDate: "",
			leavingDate: "",
			salary: 0,
			noticePeriod: 0,
			isCurrent: false,
		};
		onChange([...experiences, newItem]);
	}

	function handleItemChange(index: number, field: keyof CandidateExperienceType, value: any) {
		const list = [...experiences];
		if (field === "isCurrent") {
			list[index].isCurrent = value;
			if (value) {
				list[index].leavingDate = "";
			}
		} else {
			(list[index] as any)[field] = value;
		}
		onChange(list);
	}

	function handleRemove(index: number) {
		const list = experiences.filter((_, i) => i !== index);
		onChange(list);
		if (list.length === 0) {
			setHasExperience(false);
		}
	}

	return (
		<div className="space-y-4 border-t border-slate-100 pt-4">
			<div className="flex items-center justify-between">
				<Label className="text-xs font-bold text-slate-700 flex items-center gap-2">
					<Briefcase className="h-4 w-4 text-slate-500" />
					Does the candidate have prior experience?
				</Label>
				<div className="flex gap-2 bg-slate-50 p-1 rounded-xl">
					<button
						type="button"
						onClick={() => setHasExperience(true)}
						className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							hasExperience
								? "bg-white text-indigo-650 shadow-sm"
								: "text-slate-500 hover:text-slate-700"
						}`}
					>
						Yes
					</button>
					<button
						type="button"
						onClick={() => setHasExperience(false)}
						className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
							!hasExperience
								? "bg-white text-slate-700 shadow-sm"
								: "text-slate-500 hover:text-slate-700"
						}`}
					>
						No
					</button>
				</div>
			</div>

			{hasExperience && (
				<div className="space-y-4">
					{experiences.map((exp, index) => (
						<div key={index} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 relative space-y-3">
							<div className="flex justify-between items-center mb-1">
								<span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
									Employer #{index + 1}
								</span>
								{experiences.length > 1 && (
									<button
										type="button"
										onClick={() => handleRemove(index)}
										className="text-slate-400 hover:text-red-500 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Company Name</Label>
									<Input
										required
										value={exp.companyName}
										onChange={(e) => handleItemChange(index, "companyName", e.target.value)}
										placeholder="e.g. Acme Corporation"
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Designation / Role</Label>
									<Input
										required
										value={exp.designation}
										onChange={(e) => handleItemChange(index, "designation", e.target.value)}
										placeholder="e.g. Software Developer"
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Joining Date</Label>
									<Input
										required
										type="date"
										value={exp.joiningDate ? exp.joiningDate.split("T")[0] : ""}
										onChange={(e) => handleItemChange(index, "joiningDate", e.target.value)}
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Leaving Date</Label>
									<Input
										required={!exp.isCurrent}
										disabled={exp.isCurrent}
										type="date"
										value={exp.leavingDate ? exp.leavingDate.split("T")[0] : ""}
										onChange={(e) => handleItemChange(index, "leavingDate", e.target.value)}
										className="h-9 text-xs rounded-lg border-slate-200 bg-white disabled:bg-slate-100 disabled:opacity-50"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Current Salary (Annual L.P.A / CTC)</Label>
									<Input
										required
										type="number"
										value={exp.salary || ""}
										onChange={(e) => handleItemChange(index, "salary", Number(e.target.value))}
										placeholder="e.g. 600000"
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-[11px] font-bold text-slate-500">Notice Period (in Days)</Label>
									<Input
										required
										type="number"
										value={exp.noticePeriod || ""}
										onChange={(e) => handleItemChange(index, "noticePeriod", Number(e.target.value))}
										placeholder="e.g. 30"
										className="h-9 text-xs rounded-lg border-slate-200 bg-white"
									/>
								</div>
							</div>

							<div className="flex items-center gap-2 pt-1.5">
								<input
									type="checkbox"
									id={`isCurrent-${index}`}
									checked={exp.isCurrent}
									onChange={(e) => handleItemChange(index, "isCurrent", e.target.checked)}
									className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
								/>
								<label htmlFor={`isCurrent-${index}`} className="text-xs font-semibold text-slate-600 cursor-pointer">
									This is my current employer
								</label>
							</div>
						</div>
					))}

					<Button
						type="button"
						onClick={handleAddExperience}
						className="w-full h-9 bg-slate-50 hover:bg-slate-100 text-indigo-650 hover:text-indigo-700 border border-indigo-100 border-dashed rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Another Employer
					</Button>
				</div>
			)}
		</div>
	);
}
