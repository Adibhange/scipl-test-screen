"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Mail, Phone, Briefcase, Calendar, MapPin, BadgeCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import { AdminQuestionReviewSkeleton } from "@/components/admin/admin-question-review-skeleton";
import type { AdminRole, CandidateResult } from "@/types";
import { ROLES } from "@/data/roles";
import { EXPERIENCE_LEVELS } from "@/data/experience";

const AdminQuestionReview = dynamic(
	() =>
		import("@/components/admin/admin-question-review").then(
			(mod) => mod.AdminQuestionReview,
		),
	{
		ssr: false,
		loading: () => <AdminQuestionReviewSkeleton />,
	},
);

type Item = {
	answer: any;
	question: any;
};

export function CandidateDetailWrapper({
	result: initialResult,
	items,
	admin,
}: {
	result: CandidateResult;
	items: Item[];
	admin: { userId: string; name: string; email: string; role: AdminRole };
}) {
	const [view, setView] = useState<"details" | "assessment">("details");
	const [result, setResult] = useState<CandidateResult>(initialResult);

	// Staff lists for HR assignment dropdown
	const [staff, setStaff] = useState<Array<{ user_id: string; name: string; email: string; role: string }>>([]);
	
	// Dynamic Metadata lists
	const [rolesList, setRolesList] = useState<Array<{ value: string; label: string; track?: string }>>([...ROLES]);
	const [experienceList, setExperienceList] = useState<Array<{ value: string; label: string; filled?: number }>>([...EXPERIENCE_LEVELS]);
	const [testLocationsList, setTestLocationsList] = useState<Array<{ value: string; label: string }>>([
		{ value: "home", label: "Home" },
		{ value: "pune_office", label: "Pune Office" },
		{ value: "thane_office", label: "Thane Office" },
		{ value: "other", label: "Other" }
	]);

	// Fetch dynamic metadata & staff users
	useEffect(() => {
		fetch("/api/candidates/metadata")
			.then((res) => (res.ok ? res.json() : {}))
			.then((data: any) => {
				if (data.roles) setRolesList(data.roles);
				if (data.experience) setExperienceList(data.experience);
				if (data.testLocations) setTestLocationsList(data.testLocations);
			})
			.catch((err) => console.warn("Failed to load metadata:", err));

		if (admin.role === "hr") {
			fetch("/api/admin/users")
				.then((res) => (res.ok ? res.json() : []))
				.then(setStaff)
				.catch((err) => console.warn("Failed to load staff list:", err));
		}
	}, [admin.role]);

	// Form states
	const [form, setForm] = useState<{
		hiringStatus: string;
		hiringLocation: string;
		expectedSalary: string;
		offerSalary: string;
		hrNotes: string;
		role: string;
		experience: string;
		testLocation: string;
		interviewerEmail: string;
		interviewerName: string;
	}>({
		hiringStatus: result.candidate.hiringStatus ?? "screening",
		hiringLocation: result.candidate.hiringLocation ?? "",
		expectedSalary: result.candidate.expectedSalary?.toString() ?? "",
		offerSalary: result.candidate.offerSalary?.toString() ?? "",
		hrNotes: result.candidate.hrNotes ?? "",
		role: result.candidate.role ?? "",
		experience: result.candidate.experience ?? "",
		testLocation: result.candidate.testLocation ?? "home",
		interviewerEmail: result.assignedInterviewerEmail ?? "",
		interviewerName: result.assignedInterviewerName ?? "",
	});

	// Sync form state when result state updates
	useEffect(() => {
		setForm({
			hiringStatus: result.candidate.hiringStatus ?? "screening",
			hiringLocation: result.candidate.hiringLocation ?? "",
			expectedSalary: result.candidate.expectedSalary?.toString() ?? "",
			offerSalary: result.candidate.offerSalary?.toString() ?? "",
			hrNotes: result.candidate.hrNotes ?? "",
			role: result.candidate.role ?? "",
			experience: result.candidate.experience ?? "",
			testLocation: result.candidate.testLocation ?? "home",
			interviewerEmail: result.assignedInterviewerEmail ?? "",
			interviewerName: result.assignedInterviewerName ?? "",
		});
	}, [result]);

	const [savingDetails, setSavingDetails] = useState(false);
	const [detailsMessage, setDetailsMessage] = useState("");

	async function handleSaveDetails() {
		const oldResult = result;
		// Optimistic Update
		const updatedResult: CandidateResult = {
			...result,
			candidate: {
				...result.candidate,
				role: form.role,
				experience: form.experience,
				testLocation: form.testLocation as any,
				hiringLocation: form.hiringLocation || undefined,
				hiringStatus: form.hiringStatus as any,
				expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : undefined,
				offerSalary: form.offerSalary ? Number(form.offerSalary) : undefined,
				hrNotes: form.hrNotes,
			},
			assignedInterviewerEmail: form.interviewerEmail || undefined,
			assignedInterviewerName: form.interviewerName || undefined,
		};

		setResult(updatedResult);
		setSavingDetails(true);
		setDetailsMessage("");

		try {
			const response = await fetch("/api/admin/assignment", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					resultId: result.id,
					role: form.role,
					experience: form.experience,
					testLocation: form.testLocation,
					hiringLocation: form.hiringLocation,
					hiringStatus: form.hiringStatus,
					expectedSalary: form.expectedSalary ? Number(form.expectedSalary) : null,
					offerSalary: form.offerSalary ? Number(form.offerSalary) : null,
					hrNotes: form.hrNotes,
					interviewerEmail: form.interviewerEmail,
					interviewerName: form.interviewerName,
				}),
			});

			if (response.ok) {
				const nextResult = await response.json();
				setResult(nextResult);
				setDetailsMessage("Candidate details and assignment saved successfully");
			} else {
				const body = await response.json().catch(() => null);
				setDetailsMessage(body?.error ?? "Could not save candidate details");
				setResult(oldResult);
			}
		} catch (err) {
			setDetailsMessage("Could not save details due to a network error.");
			setResult(oldResult);
		} finally {
			setSavingDetails(false);
		}
	}

	const [savingRound, setSavingRound] = useState(false);
	const [roundMessage, setRoundMessage] = useState("");

	async function saveRound(round: "face_to_face" | "assessment" | "director", status: "pass" | "fail", remarks: string) {
		const oldResult = result;
		const updatedRounds = {
			...(result.interviewRounds ?? {}),
			[round]: {
				...(result.interviewRounds?.[round] ?? {}),
				status,
				remarks,
				updatedAt: new Date().toISOString(),
			},
		};
		const updatedResult: CandidateResult = {
			...result,
			interviewRounds: updatedRounds as any,
		};

		// Optimistic Update
		setResult(updatedResult);
		setSavingRound(true);
		setRoundMessage("");

		try {
			const response = await fetch("/api/admin/round", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					resultId: result.id,
					round,
					status,
					remarks,
				}),
			});

			if (response.ok) {
				const nextResult = await response.json();
				setResult(nextResult);
				setRoundMessage(`Round marked ${status} successfully`);
			} else {
				const body = await response.json().catch(() => null);
				setRoundMessage(body?.error ?? "Could not save round review");
				setResult(oldResult);
			}
		} catch (err) {
			setRoundMessage("Could not save round review due to a network error.");
			setResult(oldResult);
		} finally {
			setSavingRound(false);
		}
	}

	const initials =
		result.candidate.name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((n) => n[0])
			.join("")
			.toUpperCase() || "C";

	const sortedRounds = [
		{ key: "face_to_face" as const, label: "Round 1 · Face-to-Face Interview", round: result.interviewRounds?.face_to_face, defaultOrder: 1 },
		{ key: "assessment" as const, label: "Round 2 · Technical Assessment", round: result.interviewRounds?.assessment, defaultOrder: 2 },
		{ key: "director" as const, label: "Round 3 · Director Interview", round: result.interviewRounds?.director, defaultOrder: 3 },
	].sort((a, b) => a.defaultOrder - b.defaultOrder);

	return (
		<div className="w-full">
			{view === "details" ? (
				<section className='mx-auto max-w-[90rem] w-full px-4 md:px-8 space-y-6 py-4'>
					{/* Navigation / Actions Bar */}
					<div className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4'>
						<Link
							href='/admin'
							className='flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors'>
							<ArrowLeft className="h-3.5 w-3.5" /> Back to candidate pipeline
						</Link>

						<div className="flex items-center gap-3">
							{admin.role === "hr" ? (
								<>
									<Button
										onClick={() => setView("assessment")}
										variant="outline"
										className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-10 px-4 cursor-pointer"
										size="sm">
										<BookOpen className="h-4 w-4" /> View Candidate Assignment
									</Button>

									<Dialog>
										<DialogTrigger asChild>
											<Button
												className="gap-2 text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all rounded-xl h-10 px-4 cursor-pointer font-semibold"
												size="sm">
												<Settings className="h-4 w-4" /> Manage Candidate Details
											</Button>
										</DialogTrigger>
										<DialogContent className="w-full max-w-2xl bg-white rounded-3xl p-8 lg:p-10 shadow-2xl border border-slate-100">
											<DialogHeader className="pb-4">
												<DialogTitle className="text-2xl font-serif tracking-tight text-slate-900">Manage Candidate Details</DialogTitle>
												<DialogDescription className="text-xs text-slate-500 mt-2 leading-relaxed">
													Configure applicant status, role, location, assigned interviewer, compensation, and notes.
												</DialogDescription>
											</DialogHeader>

											<div className="grid grid-cols-2 gap-x-6 gap-y-5 mt-6">
												{/* Row 1 */}
												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Hiring Status</label>
													<Select
														value={form.hiringStatus}
														onValueChange={(val) => setForm({ ...form, hiringStatus: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue placeholder="Select status" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															<SelectItem value="screening" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">Screening</SelectItem>
															<SelectItem value="interviewing" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">Interviewing</SelectItem>
															<SelectItem value="offered" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">Offered</SelectItem>
															<SelectItem value="hired" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">Hired</SelectItem>
															<SelectItem value="rejected" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">Rejected</SelectItem>
															<SelectItem value="on_hold" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">On Hold</SelectItem>
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Assigned Interviewer</label>
													<Select
														value={form.interviewerEmail}
														onValueChange={(v) => {
															const selected = staff.find((u) => u.email === v);
															setForm({
																...form,
																interviewerEmail: v,
																interviewerName: selected?.name ?? "",
															});
														}}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue placeholder="Assign interviewer" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															<SelectItem value="" className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-400 cursor-pointer">Unassigned</SelectItem>
															{staff.filter((u) => u.role === "interviewer").map((user) => (
																<SelectItem key={user.user_id} value={user.email} className="rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-700 cursor-pointer">
																	<div className="flex flex-col">
																		<span>{user.name}</span>
																		<span className="text-[10px] text-slate-405 font-normal">{user.email}</span>
																	</div>
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												{/* Row 2 */}
												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Role Requirement</label>
													<Select
														value={form.role}
														onValueChange={(val) => setForm({ ...form, role: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue placeholder="Select role" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															{rolesList.map((r) => (
																<SelectItem key={r.value} value={r.value} className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">
																	{r.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Experience (Yrs)</label>
													<Select
														value={form.experience}
														onValueChange={(val) => setForm({ ...form, experience: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue placeholder="Select experience" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															{experienceList.map((el) => (
																<SelectItem key={el.value} value={el.value} className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">
																	{el.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												{/* Row 3 */}
												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Test Location</label>
													<Select
														value={form.testLocation}
														onValueChange={(val) => setForm({ ...form, testLocation: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue placeholder="Select test location" />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1">
															{testLocationsList.map((tl) => (
																<SelectItem key={tl.value} value={tl.value} className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">
																	{tl.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>

												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Hiring Location</label>
													<Input
														value={form.hiringLocation}
														onChange={(e) => setForm({ ...form, hiringLocation: e.target.value })}
														placeholder="e.g. Pune"
														className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-1 focus:ring-indigo-205 transition-all"
													/>
												</div>

												{/* Row 4 */}
												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Expected Salary (₹)</label>
													<Input
														type="number"
														value={form.expectedSalary}
														onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
														placeholder="Expected CTC"
														className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-hidden"
													/>
												</div>

												<div className="space-y-2 col-span-1">
													<label className="text-xs font-bold text-slate-600 block mb-1">Offer Salary (₹)</label>
													<Input
														type="number"
														value={form.offerSalary}
														onChange={(e) => setForm({ ...form, offerSalary: e.target.value })}
														placeholder="Offered CTC"
														className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-hidden"
													/>
												</div>

												{/* Row 5 */}
												<div className="space-y-2 col-span-2">
													<label className="text-xs font-bold text-slate-600 block mb-1">HR Notes</label>
													<Textarea
														value={form.hrNotes}
														onChange={(e) => setForm({ ...form, hrNotes: e.target.value })}
														placeholder="Enter HR notes regarding candidate interview..."
														className="min-h-24 max-h-40 resize-y rounded-xl border-slate-200 text-xs leading-relaxed"
													/>
												</div>
											</div>

											{detailsMessage && (
												<p className="text-xs font-semibold text-muted-foreground mt-4">{detailsMessage}</p>
											)}

											<div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:justify-end">
												<DialogClose asChild>
													<Button
														type="button"
														variant="outline"
														className="h-10 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer w-full sm:w-auto"
													>
														Cancel
													</Button>
												</DialogClose>
												<DialogClose asChild>
													<Button
														onClick={handleSaveDetails}
														disabled={savingDetails}
														className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md w-full sm:w-auto flex items-center justify-center"
													>
														{savingDetails ? "Saving..." : "Save Assignment & Details"}
													</Button>
												</DialogClose>
											</div>
										</DialogContent>
									</Dialog>
								</>
							) : (
								<Button
									onClick={() => setView("assessment")}
									className="gap-2 text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all rounded-xl h-10 px-4 cursor-pointer"
									size="sm">
									<BookOpen className="h-4 w-4" /> View Candidate Assignment
								</Button>
							)}
						</div>
					</div>

					{/* Unified Split Layout */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
						{/* Left Side Panel (33% Width on Desktop) */}
						<div className="lg:col-span-1 space-y-6">
							{/* Card A: Profile Header */}
							<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs overflow-hidden relative">
								<div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4F46E5]" />
								<div className="flex items-center gap-4">
									<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 text-lg font-bold border border-indigo-100">
										{initials}
									</div>
									<div className="min-w-0">
										<span className='inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider'>
											Candidate profile
										</span>
										<h1 className="mt-1 text-xl font-extrabold text-slate-900 tracking-tight truncate">
											{result.candidate.name}
										</h1>
										<div className="mt-1.5 space-y-1 text-xs font-medium text-slate-500">
											<p className="flex items-center gap-1.5 truncate">
												<Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
												{result.candidate.email}
											</p>
											<p className="flex items-center gap-1.5">
												<Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
												{result.candidate.mobile}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Card B: Consolidated Metadata & Placement */}
							<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs overflow-hidden relative">
								<div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4F46E5]" />
								<h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Candidate Details</h2>
								<div className="space-y-3.5 text-xs">
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Role</span>
										<span className="font-bold text-slate-800 capitalize">{result.candidate.role}</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Experience</span>
										<span className="font-bold text-slate-800 capitalize">{result.candidate.experience} years</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Test Location</span>
										<span className="font-bold text-slate-800">
											{result.candidate.testLocation === "pune_office" ? "Pune Office"
												: result.candidate.testLocation === "thane_office" ? "Thane Office"
												: result.candidate.testLocation === "other" ? "Other"
												: "Home"}
										</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Hiring Location</span>
										<span className="font-bold text-slate-800">{result.candidate.hiringLocation ?? "Not assigned"}</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Hiring Status</span>
										<span className={`rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px] tracking-wide border ${
											result.candidate.hiringStatus === "hired" ? "bg-emerald-50 border-emerald-250 text-emerald-800"
											: result.candidate.hiringStatus === "rejected" ? "bg-red-50 border-red-250 text-red-800"
											: result.candidate.hiringStatus === "on_hold" ? "bg-amber-50 border-amber-250 text-amber-800"
											: "bg-slate-50 border-slate-200 text-slate-700"
										}`}>
											{result.candidate.hiringStatus ?? "Screening"}
										</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Expected Salary</span>
										<span className="font-bold text-slate-800">
											{result.candidate.expectedSalary ? `₹${result.candidate.expectedSalary.toLocaleString()}` : "Not stated"}
										</span>
									</div>
									<div className="flex justify-between items-center py-1.5 border-b border-slate-100">
										<span className="font-semibold text-slate-400">Offer Salary</span>
										<span className="font-bold text-slate-800">
											{result.candidate.offerSalary ? `₹${result.candidate.offerSalary.toLocaleString()}` : "Not offered"}
										</span>
									</div>
									<div className="pt-2">
										<span className="font-semibold text-slate-400 block mb-1">HR Notes</span>
										<p className="text-slate-650 bg-slate-50 rounded-xl p-3 border border-slate-100 italic leading-relaxed whitespace-pre-wrap">
											{result.candidate.hrNotes || "No HR notes recorded"}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Right Side Panel (66% Width on Desktop) */}
						<div className="lg:col-span-2 space-y-6">
							{/* Card: Workflow Timeline */}
							<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs overflow-hidden relative">
								<div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4F46E5]" />
								<h2 className="text-sm font-bold text-slate-900">Assessment Workflow Timeline</h2>
								<p className="text-xs text-slate-500 mt-1">Track rounds progress and feedback records chronologically.</p>

								<div className="mt-7 relative pl-6 ml-4 space-y-6">
									{sortedRounds.map(({ key, label, round }, idx) => {
										const status = round?.status ?? "pending";
										const remarks = round?.remarks ?? "";
										const isPass = status === "pass";
										const isFail = status === "fail";
										const canEdit = admin.role === "hr" || 
														(admin.role === "interviewer" && key !== "director" && result.assignedInterviewerId === admin.userId) || 
														(admin.role === "director" && key === "director");

										// Check if any previous round in sequence has failed
										const hasPreviousFail = sortedRounds.slice(0, idx).some(r => r.round?.status === "fail");

										return (
											<div key={key} className="relative group">
												{/* Background track line */}
												{idx < sortedRounds.length - 1 && (
													<div className="absolute -left-[24px] top-6 bottom-[-24px] w-0.5 bg-slate-100" />
												)}
												{/* Active colored path overlay */}
												{idx < sortedRounds.length - 1 && (isPass || isFail) && (
													<div className={`absolute -left-[24px] top-6 bottom-[-24px] w-0.5 ${
														isPass ? "bg-emerald-500" : "bg-red-200"
													}`} />
												)}

												{/* Timeline Dot Indicator */}
												<div className={`absolute -left-[33px] top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white shadow-xs ${
													hasPreviousFail ? "bg-slate-300 ring-2 ring-slate-100"
													: isPass ? "bg-emerald-500 ring-2 ring-emerald-100"
													: isFail ? "bg-red-500 ring-2 ring-red-100"
													: "bg-amber-400 ring-2 ring-amber-100 animate-pulse"
												}`} />

												<div className={`rounded-xl p-5 border transition-all duration-200 ${
													hasPreviousFail ? "bg-slate-100/40 border-slate-200 text-slate-400 opacity-50 select-none"
													: isPass ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-xs shadow-emerald-50/20"
													: isFail ? "bg-red-50/50 border-red-250 text-red-850"
													: "bg-slate-50/40 border-slate-200/80 text-slate-600"
												}`}>
													<div className="flex flex-wrap items-center justify-between gap-3">
														<span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
														<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
															hasPreviousFail ? "bg-slate-150 border-slate-300 text-slate-500 line-through"
															: isPass ? "bg-emerald-100 border-emerald-250 text-emerald-800"
															: isFail ? "bg-red-100 border-red-250 text-red-800"
															: "bg-amber-100 border-amber-250 text-amber-800"
														}`}>{hasPreviousFail ? "LOCKED" : status}</span>
													</div>

													<div className="mt-3">
														{remarks ? (
															<p className={`text-xs leading-relaxed font-medium whitespace-pre-wrap ${
																hasPreviousFail ? "text-slate-400"
																: isPass ? "text-emerald-850" 
																: isFail ? "text-red-850" 
																: "text-slate-600"
															}`}>
																"{remarks}"
															</p>
														) : (
															<p className="text-xs italic text-slate-400 font-medium">No feedback submitted yet</p>
														)}
													</div>

													{canEdit && (
														<div className="mt-4 pt-4 border-t border-slate-100/50 flex justify-end">
															<RoundFeedbackDialog
																label={label}
																status={status}
																remarks={remarks}
																onSave={(newStatus, newRemarks) => saveRound(key, newStatus, newRemarks)}
																saving={savingRound}
																disabled={hasPreviousFail}
															/>
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
								{roundMessage && (
									<p className="mt-4 text-xs font-semibold text-slate-500 text-center">{roundMessage}</p>
								)}
							</div>
						</div>
					</div>
				</section>
			) : (
				<AdminQuestionReview result={result} items={items} onBack={() => setView("details")} />
			)}
		</div>
	);
}

function RoundFeedbackDialog({
	label,
	status,
	remarks,
	onSave,
	saving,
	disabled,
}: {
	label: string;
	status: "pending" | "pass" | "fail";
	remarks: string;
	onSave: (status: "pass" | "fail", remarks: string) => void;
	saving: boolean;
	disabled?: boolean;
}) {
	const [note, setNote] = useState(remarks);

	useEffect(() => {
		setNote(remarks);
	}, [remarks]);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button disabled={disabled} className="h-9 px-4 text-xs font-bold cursor-pointer rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
					{status === "pending" ? "Give Feedback" : "Edit Feedback"}
				</Button>
			</DialogTrigger>
			<DialogContent className="w-full max-w-2xl bg-white rounded-2xl border p-6">
				<DialogHeader className="pb-2">
					<DialogTitle className="text-base font-extrabold text-slate-900">{label}</DialogTitle>
					<DialogDescription className="text-xs text-slate-500 mt-1">
						Submit your interview evaluation and remarks for this round.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4">
					<Textarea
						className="min-h-36 resize-none rounded-xl border-slate-200 text-sm leading-relaxed placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						placeholder="Provide detailed feedback on candidate performance..."
					/>
				</div>
				<DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
					<DialogClose asChild>
						<Button
							disabled={saving}
							onClick={() => onSave("fail", note)}
							className="h-10 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-bold text-xs cursor-pointer shadow-none w-full sm:w-auto">
							Fail Round
						</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button
							disabled={saving}
							onClick={() => onSave("pass", note)}
							className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md w-full sm:w-auto">
							Pass Round
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
