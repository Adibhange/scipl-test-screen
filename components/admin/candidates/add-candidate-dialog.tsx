"use client";

import { useState, useEffect } from "react";
import { getCandidateMetadata, type CandidateMetadataResponse } from "@/services/client/candidate.service";
import { preRegisterCandidate } from "@/services/client/admin.service";
import { ExperienceFormSection } from "./experience-form-section";
import { ReferenceFormSection } from "./reference-form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { UserPlus, Sparkles, Loader2 } from "lucide-react";
import { EXPERIENCE_LEVELS } from "@/constants/experience";

export function AddCandidateDialog({
	rolesList,
	testLocationsList,
	experienceList = [...EXPERIENCE_LEVELS],
}: {
	rolesList: Array<{ value: string; label: string }>;
	testLocationsList: Array<{ value: string; label: string }>;
	experienceList?: Array<{ value: string; label: string }>;
}) {
	const [open, setOpen] = useState(false);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [mobile, setMobile] = useState("");
	const [email, setEmail] = useState("");
	const [testLocation, setTestLocation] = useState("home");
	const [vacancyId, setVacancyId] = useState("");
	const [experiences, setExperiences] = useState<any[]>([]);
	const [references, setReferences] = useState<any[]>([]);
	interface VacancyItem {
		id: string;
		role: string;
		experience: string;
		hiring_location: string;
		test_locations: string[];
		openings: number;
		is_active: boolean;
	}

	const [vacanciesList, setVacanciesList] = useState<VacancyItem[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			getCandidateMetadata()
				.then((data: CandidateMetadataResponse) => {
					if (data.vacancies && Array.isArray(data.vacancies)) {
						setVacanciesList(data.vacancies);
					}
				})
				.catch((err) => console.warn("Failed to fetch vacancies:", err));
		}
	}, [open]);

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		if (!vacancyId) {
			setError("Please select a Job Vacancy");
			return;
		}

		setSubmitting(true);
		setError(null);

		const selectedVac = vacanciesList.find((v) => v.id === vacancyId);

		try {
			await preRegisterCandidate({
				firstName,
				lastName,
				mobile,
				email,
				role: selectedVac?.role,
				experience: selectedVac?.experience,
				testLocation,
				vacancyId,
				experiences: experiences.length > 0 ? experiences : undefined,
				references: references.length > 0 ? references : undefined,
			});

			setOpen(false);
			window.location.reload();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className='h-10 rounded-xl flex items-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white'>
					<UserPlus className='h-4 w-4' />
					Add Candidate
				</Button>
			</DialogTrigger>
			<DialogContent className='rounded-2xl border-slate-200 shadow-xl max-w-2xl bg-white p-8'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-slate-900 font-extrabold text-lg'>
						<Sparkles className='h-5 w-5 text-indigo-600' />
						Add Candidate Details
					</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleAdd} className='space-y-4 pt-2'>
					{error && <p className='text-xs text-red-500 font-bold'>{error}</p>}
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-1.5'>
							<Label className='text-xs font-bold text-slate-600'>First Name</Label>
							<Input
								required
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								placeholder='John'
								className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
							/>
						</div>
						<div className='space-y-1.5'>
							<Label className='text-xs font-bold text-slate-600'>Last Name / Surname</Label>
							<Input
								required
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								placeholder='Doe'
								className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
							/>
						</div>
					</div>
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-650'>
							Mobile Number
						</Label>
						<Input
							required
							value={mobile}
							onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
							placeholder='9876543210'
							maxLength={10}
							className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
						/>
					</div>
					<div className='space-y-1.5'>
						<Label className='text-xs font-bold text-slate-650'>
							Email Address
						</Label>
						<Input
							required
							type='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder='john.doe@example.com'
							className='h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold'
						/>
					</div>
					
					{/* Job Vacancy dropdown with explicit label and absolute popover portal */}
					<div className='space-y-1.5'>
						<Label htmlFor='vacancy-select' className='text-xs font-bold text-slate-655'>
							Job Vacancy
						</Label>
						<Select
							value={vacancyId}
							onValueChange={setVacancyId}
						>
							<SelectTrigger id='vacancy-select' className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
								<SelectValue placeholder='Select active vacancy' />
							</SelectTrigger>
							<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white' position='popper' sideOffset={6}>
								{vacanciesList.map((v) => {
									const rObj = rolesList.find(r => r.value === v.role);
									const eObj = experienceList.find(e => e.value === v.experience);
									return (
										<SelectItem
											key={v.id}
											value={v.id}
											className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700'>
											{rObj?.label || v.role} · {eObj?.label || v.experience} yrs ({v.openings} open)
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					</div>

					{/* Test Location dropdown with absolute popover portal */}
					<div className='space-y-1.5'>
						<Label htmlFor='test-location-select' className='text-xs font-bold text-slate-655'>
							Test Location
						</Label>
						<Select value={testLocation} onValueChange={setTestLocation}>
							<SelectTrigger id='test-location-select' className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700'>
								<SelectValue placeholder='Select location' />
							</SelectTrigger>
							<SelectContent className='rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white' position='popper' sideOffset={6}>
								{testLocationsList.map((l) => (
									<SelectItem
										key={l.value}
										value={l.value}
										className='rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700'>
										{l.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					
					{/* Candidate Experiences & References Form Sections */}
					<ExperienceFormSection experiences={experiences} onChange={setExperiences} />
					<ReferenceFormSection references={references} onChange={setReferences} />

					<Button
						type='submit'
						disabled={submitting}
						className='w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md flex items-center justify-center gap-2'>
						{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						{submitting ? "Adding..." : "Add Candidate"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
