"use client";

import { useMemo, useState, useEffect } from "react";
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
	ChevronRight,
	ShieldAlert,
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
		fetch("/api/candidates/metadata")
			.then((res) => (res.ok ? res.json() : {}))
			.then((data: any) => {
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
			<Card className='w-full max-w-3xl bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100 p-12 mx-auto flex items-center justify-center min-h-[400px]'>
				<span className='h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin' />
			</Card>
		);
	}

	if (isNoVacanciesWarningOpen) {
		return (
			<Card className='w-full max-w-3xl bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] p-8 md:p-12 relative overflow-hidden mx-auto flex flex-col justify-center min-h-[400px] animate-in fade-in zoom-in-95 duration-200'>
				<div className='absolute top-0 left-0 right-0 h-1.5 bg-amber-500' />
				<CardContent className='p-0 flex flex-col items-center text-center py-12 px-6'>
					<div className='w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100/50 shadow-xs shrink-0'>
						<ShieldAlert className='w-8 h-8 text-amber-600' />
					</div>
					<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
						No Active Vacancies
					</h2>
					<p className='text-xs text-slate-550 mt-3 max-w-sm leading-relaxed font-semibold'>
						No active vacancies are currently open. Please check back later.
					</p>
				</CardContent>
			</Card>
		);
	}

	if (isLocked) {
		return (
			<Card className='w-full max-w-3xl bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] p-8 md:p-12 relative overflow-hidden mx-auto flex flex-col justify-center min-h-[500px] animate-in fade-in zoom-in-95 duration-200'>
				<div className='absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-indigo-500 to-purple-500' />
				<CardContent className='p-0 flex flex-col items-center text-center py-12 px-6'>
					<div className='w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100/50 shadow-xs shrink-0'>
						<ShieldAlert className='w-8 h-8 text-red-600' />
					</div>
					<h2 className='text-2xl font-extrabold text-slate-900 tracking-tight'>
						Assessment Completed
					</h2>
					<p className='text-xs text-slate-500 mt-3 max-w-sm leading-relaxed font-semibold'>
						You have already completed the assessment for this specific vacancy.
					</p>
					<div className='w-full pt-8 mt-8 border-t border-slate-100'>
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
							className='w-full cursor-pointer rounded-xl text-xs font-bold h-10 border-slate-200 hover:bg-slate-50'>
							Change Vacancy Details
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='w-full max-w-3xl bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08)] p-8 md:p-12 relative overflow-hidden mx-auto'>
			<div className='absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-indigo-500 to-purple-500' />
			<CardContent className='p-0'>
				<div className='mb-8 text-left'>
					<h2 className='font-serif font-extrabold text-2xl tracking-wide text-slate-900'>
						Applicant Details
					</h2>
					<p className='text-xs text-slate-500 mt-1 font-semibold'>
						Enter your basic credentials below.
					</p>
				</div>

				<form onSubmit={submit} className='space-y-6'>
					<div className='grid sm:grid-cols-2 gap-x-4 gap-y-5'>
						{/* First Name */}
						<div className='space-y-1.5'>
							<Label className='flex items-center gap-1.5 text-xs font-bold text-slate-600'>
								<User className='h-3.5 w-3.5 text-slate-400' />
								First Name
							</Label>
							<Input
								value={firstName}
								placeholder='John'
								className='h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all'
								onChange={(e) =>
									handleChange("name", `${e.target.value} ${surname}`.trim())
								}
							/>
						</div>

						{/* Surname */}
						<div className='space-y-1.5'>
							<Label className='flex items-center gap-1.5 text-xs font-bold text-slate-600'>
								<User className='h-3.5 w-3.5 text-slate-400' />
								Surname
							</Label>
							<Input
								value={surname}
								placeholder='Doe'
								className='h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all'
								onChange={(e) =>
									handleChange("name", `${firstName} ${e.target.value}`.trim())
								}
							/>
						</div>

						{/* Mobile */}
						<div className='space-y-1.5'>
							<Label className='flex items-center gap-1.5 text-xs font-bold text-slate-600'>
								<Phone className='h-3.5 w-3.5 text-slate-400' />
								Mobile Number
							</Label>
							<div className='relative'>
								<span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold select-none'>
									+91
								</span>
								<Input
									value={form.mobile}
									maxLength={10}
									inputMode='numeric'
									className='pl-12 h-10 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all'
									placeholder='9876543210'
									onChange={(e) => handleMobileChange(e.target.value)}
								/>
							</div>
						</div>

						{/* Email */}
						<div className='space-y-1.5'>
							<Label className='flex items-center gap-1.5 text-xs font-bold text-slate-600'>
								<Mail className='h-3.5 w-3.5 text-slate-400' />
								Email Address
							</Label>
							<Input
								type='email'
								value={form.email}
								placeholder='john.doe@example.com'
								className='h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all'
								onChange={(e) => handleEmailChange(e.target.value)}
							/>
						</div>

						{/* Single Job Vacancy Dropdown with absolute popover portal */}
						<div className='space-y-1.5 sm:col-span-2'>
							<Label htmlFor='vacancy-select' className='text-xs font-bold text-slate-600'>
								Select Available Job Vacancy
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
								<SelectTrigger id='vacancy-select' className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'>
									<SelectValue placeholder='Select active vacancy…' />
								</SelectTrigger>
								<SelectContent
									className='rounded-2xl border-slate-200 shadow-xl p-1 bg-white'
									position='popper'
									sideOffset={6}>
									{vacanciesList.map((v) => {
										const rObj = rolesList.find((r) => r.value === v.role);
										const eObj = experienceList.find((e) => e.value === v.experience);
										return (
											<SelectItem
												key={v.id}
												value={v.id}
												className='rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 focus:text-indigo-700 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700'>
												{rObj?.label || v.role} ({eObj?.label || v.experience} Years Experience)
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
						</div>

						{/* Dependent Location Selection with absolute popover portal */}
						<div className='space-y-1.5 sm:col-span-2'>
							<Label htmlFor='test-location-select' className='flex items-center gap-1.5 text-xs font-bold text-slate-600'>
								<MapPin className='h-3.5 w-3.5 text-slate-400' />
								Assessment Location
							</Label>
							<Select
								value={form.testLocation}
								onValueChange={(v) => handleChange("testLocation", v)}
								disabled={!form.vacancyId}>
								<SelectTrigger id='test-location-select' className='h-10 rounded-xl border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-50'>
									<SelectValue
										placeholder={
											form.vacancyId ?
												"Select location…"
												: "Select vacancy first"
										}
									/>
								</SelectTrigger>
								<SelectContent
									className='rounded-2xl border-slate-200 shadow-xl p-1 bg-white'
									position='popper'
									sideOffset={6}>
									{activeVacancyLocations.map((loc) => (
										<SelectItem
											key={loc.value}
											value={loc.value}
											className='rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700'>
											{loc.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Action Buttons */}
					<div className='flex flex-col gap-4 border-t border-slate-100 pt-6 mt-6'>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='w-full h-11 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer'>
							{isSubmitting ? (
								<span className='flex items-center gap-2'>
									<span className='h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
									Processing...
								</span>
							) : (
								<>
									Start Your Assessment
									<ChevronRight className='h-3.5 w-3.5' />
								</>
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
