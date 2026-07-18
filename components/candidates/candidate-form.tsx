"use client";

import { useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
	User,
	Phone,
	Mail,
	Database,
	Code2,
	Rocket,
	BriefcaseBusiness,
	AlertCircle,
	ChevronRight,
} from "lucide-react";

import type { Candidate } from "@/types";
import { EXPERIENCE_LEVELS } from "@/data/experience";
import { ROLES } from "@/data/roles";

const ROLE_ICONS = {
	database: Database,
	code: Code2,
	rocket: Rocket,
	briefcase: BriefcaseBusiness,
};

function ExperienceDots({ filled }: { filled: number }) {
	return (
		<span className='inline-flex items-center gap-1'>
			{[0, 1, 2, 3].map((i) => (
				<span
					key={i}
					className={`h-1.5 w-3 rounded-full ${
						i < filled ? "bg-current" : "bg-slate-200"
					}`}
				/>
			))}
		</span>
	);
}

export function CandidateForm({
	onSubmit,
	isSubmitting = false,
	submitError = null,
}: {
	onSubmit: (candidate: Candidate) => void | Promise<void>;
	isSubmitting?: boolean;
	submitError?: string | null;
}) {
	const [form, setForm] = useState<Candidate>({
		name: "",
		mobile: "",
		email: "",
		role: "",
		experience: "",
	});

	const [errors, setErrors] = useState({
		mobile: "",
		email: "",
	});

	const firstName = form.name.split(" ")[0] || "";
	const surname = form.name.split(" ").slice(1).join(" ");

	const initials =
		((firstName[0] || "") + (surname[0] || "")).toUpperCase() || "—";

	const selectedRole = ROLES.find((r) => r.value === form.role);

	const accent = selectedRole?.accent ?? "#4F46E5";

	function handleChange(field: keyof Candidate, value: string) {
		setForm((prev) => ({
			...prev,
			[field]: value,
		}));
	}

	function handleMobileChange(raw: string) {
		const value = raw.replace(/\D/g, "").slice(0, 10);

		handleChange("mobile", value);

		if (!value) {
			setErrors((p) => ({
				...p,
				mobile: "",
			}));
			return;
		}

		if (!/^[6-9]\d{9}$/.test(value)) {
			setErrors((p) => ({
				...p,
				mobile: "Enter a valid 10 digit mobile number",
			}));
			return;
		}

		setErrors((p) => ({
			...p,
			mobile: "",
		}));
	}

	function handleEmailChange(value: string) {
		handleChange("email", value);

		if (!value) {
			setErrors((p) => ({
				...p,
				email: "",
			}));
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
			setErrors((p) => ({
				...p,
				email: "Enter a valid email address",
			}));
			return;
		}

		setErrors((p) => ({
			...p,
			email: "",
		}));
	}

	const isValid = useMemo(
		() =>
			firstName.trim().length > 0 &&
			surname.trim().length > 0 &&
			/^[6-9]\d{9}$/.test(form.mobile) &&
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
			form.role !== "" &&
			form.experience !== "",
		[form, firstName, surname],
	);

	function submit(e: React.FormEvent) {
		e.preventDefault();

		if (!isValid) return;

		void onSubmit(form);
	}

	return (
		<div className='container mx-auto max-w-5xl px-4 py-10'>
			<Card className='overflow-hidden rounded-xl shadow-sm gap-0 py-0'>
				{/* Accent Bar */}
				<div
					className='h-1.5 w-full transition-all'
					style={{ backgroundColor: accent }}
				/>

				<CardHeader className='border-b border-slate-100 px-8 pt-7 pb-5'>
					<div className='flex items-start justify-between'>
						<div>
							<p
								className='text-xs uppercase tracking-[0.25em] font-semibold'
								style={{ color: accent }}>
								Assessment Intake
							</p>

							<CardTitle className='mt-2 text-2xl font-bold'>
								Candidate Information
							</CardTitle>

							<p className='mt-1 text-sm text-slate-500'>
								Fill in your details before starting the assessment.
							</p>
						</div>

						<div
							className='hidden sm:flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white'
							style={{ backgroundColor: accent }}>
							{initials}
						</div>
					</div>
				</CardHeader>

				<CardContent className='p-8'>
					<form
						onSubmit={submit}
						className='space-y-7'>
						<div className='grid sm:grid-cols-2 gap-6'>
							{/* First Name */}

							<div className='space-y-2'>
								<Label className='flex items-center gap-2'>
									<User className='h-4 w-4 text-slate-400' />
									First Name
								</Label>

								<Input
									value={firstName}
									placeholder='John'
									className='h-11 rounded-xl'
									onChange={(e) =>
										handleChange("name", `${e.target.value} ${surname}`.trim())
									}
								/>
							</div>

							{/* Surname */}

							<div className='space-y-2'>
								<Label className='flex items-center gap-2'>
									<User className='h-4 w-4 text-slate-400' />
									Surname
								</Label>

								<Input
									value={surname}
									placeholder='Doe'
									className='h-11 rounded-xl'
									onChange={(e) =>
										handleChange(
											"name",
											`${firstName} ${e.target.value}`.trim(),
										)
									}
								/>
							</div>

							{/* Mobile */}

							<div className='space-y-2'>
								<Label className='flex items-center gap-2'>
									<Phone className='h-4 w-4 text-slate-400' />
									Mobile Number
								</Label>

								<div className='relative'>
									<span className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm'>
										+91
									</span>

									<Input
										value={form.mobile}
										maxLength={10}
										inputMode='numeric'
										className='pl-11 h-11 rounded-xl'
										placeholder='9876543210'
										onChange={(e) => handleMobileChange(e.target.value)}
									/>
								</div>

								{errors.mobile && (
									<p className='flex items-center gap-1 text-xs text-red-500'>
										<AlertCircle className='h-3 w-3' />

										{errors.mobile}
									</p>
								)}
							</div>

							{/* Email */}

							<div className='space-y-2'>
								<Label className='flex items-center gap-2'>
									<Mail className='h-4 w-4 text-slate-400' />
									Email
								</Label>

								<Input
									type='email'
									value={form.email}
									placeholder='candidate@example.com'
									className='h-11 rounded-xl'
									onChange={(e) => handleEmailChange(e.target.value)}
								/>

								{errors.email && (
									<p className='flex items-center gap-1 text-xs text-red-500'>
										<AlertCircle className='h-3 w-3' />

										{errors.email}
									</p>
								)}
							</div>
							{/* Role */}

							<div className='space-y-2'>
								<Label className='text-sm font-medium text-slate-700'>
									Role Applying For
								</Label>

								<Select
									value={form.role}
									onValueChange={(value) => handleChange("role", value)}>
									<SelectTrigger className='h-11 rounded-xl border-slate-200 w-full'>
										<SelectValue placeholder='Select role' />
									</SelectTrigger>

									<SelectContent
										className='rounded-xl p-2'
										position='popper'>
										{ROLES.map((role) => {
											const Icon = ROLE_ICONS[role.icon];

											return (
												<SelectItem
													key={role.value}
													value={role.value}
													className='rounded-lg py-3 cursor-pointer'>
													<div className='flex items-center gap-3'>
														<div
															className='flex h-8 w-8 items-center justify-center rounded-md'
															style={{
																backgroundColor: role.soft,
																color: role.accent,
															}}>
															<Icon className='h-4 w-4' />
														</div>

														<div className='flex flex-col'>
															<span className='font-medium'>{role.label}</span>

															<span className='text-xs text-slate-400'>
																{role.track}
															</span>
														</div>
													</div>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>

							{/* Experience */}

							<div className='space-y-2'>
								<Label className='text-sm font-medium text-slate-700'>
									Experience
								</Label>

								<Select
									value={form.experience}
									onValueChange={(value) => handleChange("experience", value)}>
									<SelectTrigger className='h-11 rounded-xl border-slate-200 w-full'>
										<SelectValue placeholder='Select experience' />
									</SelectTrigger>

									<SelectContent
										className='rounded-xl p-2'
										position='popper'>
										{EXPERIENCE_LEVELS.map((exp) => (
											<SelectItem
												key={exp.value}
												value={exp.value}
												className='rounded-lg py-3 cursor-pointer'>
												<div className='flex items-center justify-between w-full'>
													<span>{exp.label}</span>

													<ExperienceDots filled={exp.filled} />
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Footer */}

						<div className='flex items-center justify-between flex-wrap gap-4 border-t border-slate-100 pt-6'>
							<p className='text-xs text-slate-400'>
								All fields are required before starting the assessment.
							</p>

							<Button
								type='submit'
								disabled={!isValid || isSubmitting}
								className='h-11 px-7 rounded-xl text-white transition-all duration-300 hover:scale-[1.02]'
								style={{
									backgroundColor: isValid ? accent : "#94A3B8",
								}}>
								{isSubmitting ? "Saving..." : "Start Assessment"}
								<ChevronRight className='ml-2 h-4 w-4' />
							</Button>
						</div>
						{submitError && <p className='text-sm text-red-600'>{submitError}</p>}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
