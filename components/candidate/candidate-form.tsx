"use client";

import { useMemo, useState, useEffect } from "react";
import { getCandidateMetadata, type CandidateMetadataResponse } from "@/services/client/candidate.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
	User,
	Phone,
	Mail,
	MapPin,
	Briefcase,
	ChevronRight,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type { Candidate } from "@/types/candidate";

export function CandidateForm({
	onSubmit,
	onSubmitError,
	isSubmitting = false,
	submitError = null,
}: {
	onSubmit: (candidate: Candidate) => void | Promise<void>;
	onSubmitError: (error: string | null) => void;
	isSubmitting?: boolean;
	submitError?: string | null;
}) {
	const [form, setForm] = useState<Candidate>({
		name: "",
		mobile: "",
		email: "",
		role: "",
		experience: "",
		testLocation: "",
		vacancyId: "",
	});

	const [isLocked, setIsLocked] = useState(false);

	// Dynamic config lists from vacancies
	const [rolesList, setRolesList] = useState<Array<{ value: string; label: string }>>([]);
	const [experienceList, setExperienceList] = useState<Array<{ value: string; label: string; filled?: number }>>([]);
	const [locationsList, setLocationsList] = useState<Array<{ value: string; label: string }>>([]);
	const [vacanciesList, setVacanciesList] = useState<
		Array<{ id: string; role: string; experience: string; test_locations: string[]; openings: number }>
	>([]);
	const [loading, setLoading] = useState(true);
	const [isNoVacanciesWarningOpen, setIsNoVacanciesWarningOpen] = useState(false);

	useEffect(() => {
		getCandidateMetadata()
			.then((data: CandidateMetadataResponse) => {
				if (data.roles) setRolesList(data.roles);
				if (data.experience) setExperienceList(data.experience);
				if (data.testLocations) setLocationsList(data.testLocations);
				if (data.vacancies && Array.isArray(data.vacancies)) {
					setVacanciesList(data.vacancies);
					if (data.vacancies.length === 0) {
						setIsNoVacanciesWarningOpen(true);
					}
				} else {
					setIsNoVacanciesWarningOpen(true);
				}
			})
			.catch((err) => {
				console.warn("Could not load dynamic candidate metadata:", err);
				setIsNoVacanciesWarningOpen(true);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	// Reset page-level errors when inputs are touched
	useEffect(() => {
		onSubmitError(null);
	}, [form, onSubmitError]);

	// Filter allowed locations by selected vacancy test_locations configuration
	const activeVacancyLocations = useMemo(() => {
		if (!form.vacancyId) return [];
		const activeVac = vacanciesList.find((v) => v.id === form.vacancyId);
		if (!activeVac) return [];
		const testLocs = new Set(activeVac.test_locations);
		return locationsList.filter((l) => testLocs.has(l.value) || testLocs.has("all"));
	}, [locationsList, vacanciesList, form.vacancyId]);

	const firstName = form.name.split(" ")[0] || "";
	const surname = form.name.split(" ").slice(1).join(" ");

	function handleChange(field: keyof Candidate, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleMobileChange(raw: string) {
		const value = raw.replace(/\D/g, "").slice(0, 10);
		handleChange("mobile", value);
	}

	function handleEmailChange(value: string) {
		handleChange("email", value);
	}

	useEffect(() => {
		if (submitError && submitError.includes("already completed")) {
			setIsLocked(true);
		}
	}, [submitError]);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (isLocked || isNoVacanciesWarningOpen) return;

		if (firstName.trim().length === 0) {
			onSubmitError("Please enter your First Name.");
			return;
		}
		if (surname.trim().length === 0) {
			onSubmitError("Please enter your Surname.");
			return;
		}
		if (!form.mobile) {
			onSubmitError("Please enter your Mobile Number.");
			return;
		}
		if (!/^\d{10}$/.test(form.mobile)) {
			onSubmitError("Please enter a valid 10-digit mobile number.");
			return;
		}
		if (!form.email) {
			onSubmitError("Please enter your Email Address.");
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			onSubmitError("Please enter a valid email address.");
			return;
		}
		if (!form.vacancyId) {
			onSubmitError("Please select the Job Vacancy you are applying for.");
			return;
		}
		if (!form.testLocation) {
			onSubmitError("Please select your Assessment Location.");
			return;
		}

		onSubmitError(null);
		void onSubmit(form);
	}

	if (loading) {
		return (
			<Card className='w-full max-w-3xl bg-white rounded-2xl border border-border shadow-2xl p-12 mx-auto flex items-center justify-center min-h-[400px]'>
				<span className='h-8 w-8 border-4 border-brand-indigo-icon border-t-transparent rounded-full animate-spin' />
			</Card>
		);
	}

	if (isNoVacanciesWarningOpen) {
		return (
			<Card className='w-full max-w-3xl bg-white rounded-2xl border border-border shadow-2xl p-8 md:p-12 relative overflow-hidden mx-auto flex flex-col justify-center min-h-[400px] animate-in fade-in zoom-in-95 duration-200'>
				<div className='absolute top-0 left-0 right-0 h-2 bg-amber-500' />
				<CardContent className='p-0 flex flex-col items-center text-center py-12 px-6'>
					<div className='w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100/50 shadow-xs shrink-0'>
						<ShieldAlert className='w-8 h-8 text-amber-600' />
					</div>
					<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
						No Active Vacancies
					</h2>
					<p className='text-sm text-slate-500 mt-3 max-w-sm leading-relaxed font-semibold'>
						No active vacancies are currently open. Please check back later.
					</p>
				</CardContent>
			</Card>
		);
	}

	if (isLocked) {
		return (
			<Card className='w-full max-w-3xl bg-white rounded-2xl border border-border shadow-2xl p-8 md:p-12 relative overflow-hidden mx-auto flex flex-col justify-center min-h-[500px] animate-in fade-in zoom-in-95 duration-200'>
				<div className='absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0a0847] to-[#3d0f96]' />
				<CardContent className='p-0 flex flex-col items-center text-center py-12 px-6'>
					<div className='w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100/50 shadow-xs shrink-0'>
						<ShieldAlert className='w-8 h-8 text-red-600' />
					</div>
					<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
						Assessment Completed
					</h2>
					<p className='text-sm text-slate-500 mt-3 max-w-sm leading-relaxed font-semibold'>
						You have already completed the assessment for this specific vacancy.
					</p>
					<div className='w-full pt-8 mt-8 border-t border-border'>
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								setForm((prev) => ({
									...prev,
									vacancyId: "",
									role: "",
									experience: "",
									testLocation: "",
								}));
								setIsLocked(false);
								onSubmitError(null);
							}}
							className='w-full h-11 rounded-xl text-sm font-bold'>
							Change Vacancy Details
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='w-full max-w-3xl overflow-hidden bg-white rounded-2xl border border-border shadow-2xl mx-auto'>
			<div className='h-2 w-full bg-gradient-to-r from-[#0a0847] to-[#3d0f96]' />
			<CardContent className='p-8 md:p-10'>
				<div className='mb-9 flex items-center gap-5'>
					<div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-indigo-icon-bg'>
						<User className='h-6 w-6 text-brand-indigo-icon' strokeWidth={1.7} />
					</div>
					<div>
						<h2 className='text-2xl font-bold text-brand-navy'>
							Applicant Details
						</h2>
						<p className='text-base text-muted-foreground mt-0.5'>
							Enter your basic credentials below.
						</p>
					</div>
				</div>

				<form onSubmit={submit} className='space-y-7'>
					<div className='grid sm:grid-cols-2 gap-x-6 gap-y-7'>
						{/* First Name */}
						<div className='space-y-2'>
							<Label className='flex items-center gap-1.5 text-base'>
								<User className='h-4 w-4 text-muted-foreground' />
								First Name <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={firstName}
								placeholder='Enter first name'
								className='h-13 text-base'
								onChange={(e) =>
									handleChange("name", `${e.target.value} ${surname}`.trim())
								}
							/>
						</div>

						{/* Surname */}
						<div className='space-y-2'>
							<Label className='flex items-center gap-1.5 text-base'>
								<User className='h-4 w-4 text-muted-foreground' />
								Surname <span className='text-red-500'>*</span>
							</Label>
							<Input
								value={surname}
								placeholder='Enter surname'
								className='h-13 text-base'
								onChange={(e) =>
									handleChange("name", `${firstName} ${e.target.value}`.trim())
								}
							/>
						</div>

						{/* Mobile */}
						<div className='space-y-2'>
							<Label className='flex items-center gap-1.5 text-base'>
								<Phone className='h-4 w-4 text-muted-foreground' />
								Mobile Number <span className='text-red-500'>*</span>
							</Label>
							<div className='flex gap-2'>
								<span className='flex h-13 w-16 shrink-0 items-center justify-center rounded-lg border border-input bg-muted text-base font-semibold text-muted-foreground'>
									+91
								</span>
								<Input
									value={form.mobile}
									maxLength={10}
									inputMode='numeric'
									className='h-13 flex-1 text-base'
									placeholder='Enter mobile number'
									onChange={(e) => handleMobileChange(e.target.value)}
								/>
							</div>
						</div>

						{/* Email */}
						<div className='space-y-2'>
							<Label className='flex items-center gap-1.5 text-base'>
								<Mail className='h-4 w-4 text-muted-foreground' />
								Email Address <span className='text-red-500'>*</span>
							</Label>
							<Input
								type='email'
								value={form.email}
								placeholder='Enter email address'
								className='h-13 text-base'
								onChange={(e) => handleEmailChange(e.target.value)}
							/>
						</div>

						{/* Single Job Vacancy Dropdown with absolute popover portal */}
						<div className='space-y-2 sm:col-span-2'>
							<Label htmlFor='vacancy-select' className='flex items-center gap-1.5 text-base'>
								<Briefcase className='h-4 w-4 text-muted-foreground' />
								Select Available Job Vacancy <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={form.vacancyId}
								onValueChange={(val) => {
									const selectedVac = vacanciesList.find((v) => v.id === val);
									if (selectedVac) {
										setForm((prev) => ({
											...prev,
											vacancyId: val,
											role: selectedVac.role,
											experience: selectedVac.experience,
											testLocation: "",
										}));
									}
								}}
							>
								<SelectTrigger id='vacancy-select' className='h-13 w-full text-base'>
									<SelectValue placeholder='Select active vacancy...' />
								</SelectTrigger>
								<SelectContent position='popper' sideOffset={6}>
									{vacanciesList.map((v) => {
										const rObj = rolesList.find((r) => r.value === v.role);
										const eObj = experienceList.find((e) => e.value === v.experience);
										return (
											<SelectItem key={v.id} value={v.id}>
												{rObj?.label || v.role} ({eObj?.label || v.experience} Years Experience)
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>

						{/* Dependent Location Selection with absolute popover portal */}
						<div className='space-y-2 sm:col-span-2'>
							<Label htmlFor='test-location-select' className='flex items-center gap-1.5 text-base'>
								<MapPin className='h-4 w-4 text-muted-foreground' />
								Assessment Location <span className='text-red-500'>*</span>
							</Label>
							<Select
								value={form.testLocation}
								onValueChange={(v) => handleChange("testLocation", v)}
								disabled={!form.vacancyId}>
								<SelectTrigger id='test-location-select' className='h-13 w-full text-base disabled:opacity-50'>
									<SelectValue
										placeholder={
											form.vacancyId ?
												"Select assessment location..."
												: "Select vacancy first"
										}
									/>
								</SelectTrigger>
								<SelectContent position='popper' sideOffset={6}>
									{activeVacancyLocations.map((loc) => (
										<SelectItem key={loc.value} value={loc.value}>
											{loc.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Action Buttons */}
					<div className='pt-2'>
						<Button
							type='submit'
							disabled={isSubmitting}
							size='lg'
							className='w-full h-14 text-base bg-gradient-to-r from-[#0a0847] to-[#3d0f96] text-white hover:opacity-95 flex items-center justify-center gap-1.5'>
							{isSubmitting ? (
								<span className='flex items-center gap-2'>
									<span className='h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
									Processing...
								</span>
							) : (
								<>
									Start Your Assessment
									<ChevronRight className='h-5 w-5' />
								</>
							)}
						</Button>
					</div>
				</form>

				<p className='mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground'>
					<ShieldCheck className='h-4 w-4' />
					All information you provide is secure and confidential.
				</p>
			</CardContent>
		</Card>
	);
}
