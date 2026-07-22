"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { getCandidateMetadata } from "@/services/client/candidate.service";
import { fetchAdminUsers, fetchFreshCandidate } from "@/services/client/admin.service";
import { submitRoundFeedback, assignInterviewerAndMetadata } from "@/services/client/interview.service";
import Link from "next/link";
import { ArrowLeft, BookOpen, Mail, Phone, Settings, Loader2 } from "lucide-react";
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
import { ExperienceFormSection } from "./experience-form-section";
import { ReferenceFormSection } from "./reference-form-section";
import dynamic from "next/dynamic";
import { AdminQuestionReviewSkeleton } from "@/components/admin/review/admin-question-review-skeleton";
import type { AdminRole, CandidateResult, CandidateExperienceType, CandidateReferenceType } from "@/types";
import { ROLES } from "@/constants/roles";
import { EXPERIENCE_LEVELS } from "@/constants/experience";

const AdminQuestionReview = dynamic(
	() =>
		import("@/components/admin/review/admin-question-review").then(
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
	const [hiringLocationsList, setHiringLocationsList] = useState<Array<{ value: string; label: string }>>([
		{ value: "pune", label: "Pune" },
		{ value: "thane", label: "Thane" },
		{ value: "bangalore", label: "Bangalore" }
	]);

	const [vacanciesList, setVacanciesList] = useState<any[]>([]);

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
		experiences: CandidateExperienceType[];
		references: CandidateReferenceType[];
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
		experiences: (result.candidate as any).experiences ?? [],
		references: (result.candidate as any).references ?? [],
	});

	const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

	// Fetch dynamic metadata & staff users
	useEffect(() => {
		getCandidateMetadata()
			.then((data: any) => {
				if (data.roles) setRolesList(data.roles);
				if (data.experience) setExperienceList(data.experience);
				if (data.testLocations) setTestLocationsList(data.testLocations);
				if (data.hiringLocations) setHiringLocationsList(data.hiringLocations);
				if (data.vacancies) {
					setVacanciesList(data.vacancies);
					
					// Find matching vacancy and hydrate role / hiringLocation if they are blank
					const activeVac = data.vacancies.find((v: any) => v.id === result.candidate.vacancyId);
					if (activeVac) {
						setForm((prev) => ({
							...prev,
							role: prev.role || activeVac.role || "",
							hiringLocation: prev.hiringLocation || activeVac.hiring_location || "",
						}));
					}
				}
			})
			.catch((err) => console.warn("Failed to load metadata:", err));

		if (admin.role === "hr") {
			fetchAdminUsers()
				.then(setStaff)
				.catch((err) => console.warn("Failed to load staff list:", err));
		}
	}, [admin.role, result.candidate.vacancyId]);

	// Bind interviewer roster pre-selection based on user ID matches
	useEffect(() => {
		if (staff.length > 0 && result.assignedInterviewerId) {
			const assignedUser = staff.find(u => u.user_id === result.assignedInterviewerId);
			if (assignedUser) {
				Promise.resolve().then(() => {
					setForm(prev => ({
						...prev,
						interviewerEmail: assignedUser.email,
						interviewerName: assignedUser.name,
					}));
				});
			}
		}
	}, [staff, result.assignedInterviewerId]);



	// Sync form state when result state updates or dialog opens
	useEffect(() => {
		if (isManageDialogOpen) {
			const activeVac = vacanciesList.find((v: any) => v.id === result.candidate.vacancyId);
			Promise.resolve().then(() => {
				setForm({
					hiringStatus: result.candidate.hiringStatus ?? "screening",
					hiringLocation: result.candidate.hiringLocation || activeVac?.hiring_location || "",
					expectedSalary: result.candidate.expectedSalary?.toString() ?? "",
					offerSalary: result.candidate.offerSalary?.toString() ?? "",
					hrNotes: result.candidate.hrNotes ?? "",
					role: result.candidate.role || activeVac?.role || "",
					experience: result.candidate.experience ?? "",
					testLocation: result.candidate.testLocation ?? "home",
					interviewerEmail: result.assignedInterviewerEmail ?? "",
					interviewerName: result.assignedInterviewerName ?? "",
					experiences: (result.candidate as any).experiences ?? [],
					references: (result.candidate as any).references ?? [],
				});
			});
		}
	}, [isManageDialogOpen, result, vacanciesList]);

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
				experiences: form.experiences,
				references: form.references,
			} as any,
			assignedInterviewerEmail: form.interviewerEmail || undefined,
			assignedInterviewerName: form.interviewerName || undefined,
		};

		setResult(updatedResult);
		setSavingDetails(true);
		setDetailsMessage("");

		try {
			const nextResult = await assignInterviewerAndMetadata({
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
				experiences: form.experiences,
				references: form.references,
			});
			setResult(nextResult);
			setDetailsMessage("Candidate details and assignment saved successfully");
		} catch (err: any) {
			setDetailsMessage(err.message ?? "Could not save candidate details");
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
			const nextResult = await submitRoundFeedback({
				resultId: result.id,
				round,
				status,
				remarks,
			});
			// Re-fetch a second time after a short delay so DB triggers (e.g. hiring_status
			// auto-advance) have time to commit before we update local state.
			setResult(nextResult);
			setRoundMessage(`Round marked ${status} successfully`);
			setTimeout(async () => {
				try {
					if (result.candidate.id) {
						const freshData = await fetchFreshCandidate(result.candidate.id);
						if (freshData?.candidate) {
							setResult(prev => ({ ...prev, candidate: { ...prev.candidate, hiringStatus: freshData.candidate.hiringStatus } }));
						}
					}
				} catch {}
			}, 800);
		} catch {
			setRoundMessage("Could not save round review due to a network error.");
			setResult(oldResult);
		} finally {
			setSavingRound(false);
		}
	}

	// Per-round interviewer assignment — independent of the global manage modal
	const [savingRoundInterviewer, setSavingRoundInterviewer] = useState<Record<string, boolean>>({});
	const [roundInterviewerSearch, setRoundInterviewerSearch] = useState<Record<string, string>>({});
	const [roundInterviewerOpen, setRoundInterviewerOpen] = useState<Record<string, boolean>>({});

	async function saveRoundInterviewer(
		round: "face_to_face" | "assessment" | "director",
		interviewerEmail: string,
		interviewerName: string,
	) {
		const oldResult = result;
		const assignedId = interviewerEmail
			? (staff.find(u => u.email === interviewerEmail)?.user_id ?? result.assignedInterviewerId)
			: undefined;
		setResult(prev => ({
			...prev,
			assignedInterviewerId: assignedId,
			assignedInterviewerEmail: interviewerEmail || undefined,
			assignedInterviewerName: interviewerName || undefined,
		}));
		setSavingRoundInterviewer(prev => ({ ...prev, [round]: true }));
		try {
			const nextResult = await assignInterviewerAndMetadata({
				resultId: result.id,
				interviewerEmail,
				interviewerName,
			});
			setResult(nextResult);
		} catch {
			setResult(oldResult);
		} finally {
			setSavingRoundInterviewer(prev => ({ ...prev, [round]: false }));
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

									<Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
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
													<label className="text-xs font-bold text-slate-600 block mb-1">Role Requirement</label>
													<Select
														key={`${form.role}-${rolesList.length}`}
														value={form.role}
														onValueChange={(val) => setForm({ ...form, role: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue>
																{rolesList.length > 0 ? 
																	(rolesList.find(r => r.value === form.role)?.label || form.role || "Select role") 
																	: "Loading role data..."
																}
															</SelectValue>
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white" position="popper" sideOffset={6}>
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
														key={`${form.experience}-${experienceList.length}`}
														value={form.experience}
														onValueChange={(val) => setForm({ ...form, experience: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue>
																{experienceList.length > 0 ? 
																	(experienceList.find(e => e.value === form.experience)?.label || form.experience || "Select experience") 
																	: "Loading experience data..."
																}
															</SelectValue>
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white" position="popper" sideOffset={6}>
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
														key={`${form.testLocation}-${testLocationsList.length}`}
														value={form.testLocation}
														onValueChange={(val) => setForm({ ...form, testLocation: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue>
																{testLocationsList.length > 0 ? 
																	(testLocationsList.find(tl => tl.value === form.testLocation)?.label || form.testLocation || "Select test location") 
																	: "Loading location data..."
																}
															</SelectValue>
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white" position="popper" sideOffset={6}>
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
													<Select
														key={`${form.hiringLocation}-${hiringLocationsList.length}`}
														value={form.hiringLocation}
														onValueChange={(val) => setForm({ ...form, hiringLocation: val })}
													>
														<SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer">
															<SelectValue>
																{hiringLocationsList.length > 0 ? 
																	(hiringLocationsList.find(hl => hl.value === form.hiringLocation)?.label || form.hiringLocation || "Select hiring location") 
																	: "Loading location data..."
																}
															</SelectValue>
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-slate-200 bg-white shadow-xl p-1 bg-white" position="popper" sideOffset={6}>
															{hiringLocationsList.map((hl) => (
																<SelectItem key={hl.value} value={hl.value} className="rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 cursor-pointer">
																	{hl.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
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

												{/* Candidate Experiences & References Form Sections */}
												<div className="col-span-2 space-y-4">
													<ExperienceFormSection
														experiences={form.experiences}
														onChange={(exps) => setForm({ ...form, experiences: exps })}
													/>
													<ReferenceFormSection
														references={form.references}
														onChange={(refs) => setForm({ ...form, references: refs })}
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
														className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-md w-full sm:w-auto flex items-center justify-center gap-2"
													>
														{savingDetails && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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

							{/* Card: Employment History */}
							<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs relative space-y-4">
								<h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-extrabold">
									Employment History
								</h2>
								{!(result.candidate as any).experiences || (result.candidate as any).experiences.length === 0 ? (
									<p className="text-xs text-slate-400 font-semibold italic">No employment history provided.</p>
								) : (
									<div className="space-y-3.5">
										{((result.candidate as any).experiences).map((exp: any) => (
											<div key={exp.id || exp.company_name} className="text-xs border-l-2 border-indigo-500 pl-3 space-y-1">
												<div className="flex justify-between items-start">
													<h4 className="font-extrabold text-slate-800">{exp.designation}</h4>
													{exp.is_current && (
														<span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
															Current
														</span>
													)}
												</div>
												<p className="font-semibold text-slate-500">{exp.company_name}</p>
												<p className="text-[10px] text-slate-400 font-medium font-bold">
													{exp.joining_date ? new Date(exp.joining_date).toLocaleDateString() : ""} - {exp.is_current ? "Present" : (exp.leaving_date ? new Date(exp.leaving_date).toLocaleDateString() : "")}
												</p>
												<div className="flex justify-between text-[10px] text-slate-400 font-bold pt-0.5">
													<span>CTC: ₹{(exp.salary || 0).toLocaleString()}</span>
													<span>Notice: {exp.notice_period || 0} days</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Card: Professional References */}
							<div className="rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-xs relative space-y-4">
								<h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 font-extrabold">
									Candidate References
								</h2>
								{!(result.candidate as any).references || (result.candidate as any).references.length === 0 ? (
									<p className="text-xs text-slate-400 font-semibold italic">No references provided.</p>
								) : (
									<div className="space-y-4">
										{((result.candidate as any).references).map((ref: any) => (
											<div key={ref.id || ref.reference_name} className="text-xs space-y-1 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
												<div className="flex justify-between items-center">
													<h4 className="font-extrabold text-slate-800">{ref.reference_name}</h4>
													<span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
														ref.reference_type === "INTERNAL" 
															? "bg-emerald-50 border border-emerald-100 text-emerald-700" 
															: "bg-blue-50 border border-blue-100 text-blue-700"
													}`}>
														{ref.reference_type}
													</span>
												</div>
												<p className="font-medium text-slate-500 font-bold">Phone: {ref.reference_mobile}</p>
												
												{ref.reference_type === "INTERNAL" && (
													<div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-bold space-y-0.5 mt-1 border border-slate-100">
														<p>Employee Code: <span className="text-slate-700 font-extrabold">{ref.employee_code || "N/A"}</span></p>
														<p>Verified By: <span className="text-slate-700 font-extrabold">{ref.verified_by || "N/A"}</span></p>
													</div>
												)}
												
												{ref.notes && (
													<p className="text-[10px] text-slate-400 font-medium italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100/50">
														Remarks: {ref.notes}
													</p>
												)}
											</div>
										))}
									</div>
								)}
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
										const canEdit = admin.role === "hr" || result.assignedInterviewerId === admin.userId;

										// Check if sequential preceding rounds have passed
										const isLocked = idx > 0 && sortedRounds[idx - 1].round?.status !== "pass";

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
													isLocked ? "bg-slate-300 ring-2 ring-slate-100"
													: isPass ? "bg-emerald-500 ring-2 ring-emerald-100"
													: isFail ? "bg-red-500 ring-2 ring-red-100"
													: "bg-amber-400 ring-2 ring-amber-100 animate-pulse"
												}`} />

												<div className={`rounded-xl p-5 border transition-all duration-200 ${
													isLocked ? "bg-slate-100/40 border-slate-200 text-slate-400 opacity-50 select-none"
													: isPass ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-xs shadow-emerald-50/20"
													: isFail ? "bg-red-50/50 border-red-250 text-red-850"
													: "bg-slate-50/40 border-slate-200/80 text-slate-600"
												}`}>
													<div className="flex flex-wrap items-center justify-between gap-3">
														<span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
														<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
															isLocked ? "bg-slate-150 border-slate-300 text-slate-500 line-through"
															: isPass ? "bg-emerald-100 border-emerald-250 text-emerald-800"
															: isFail ? "bg-red-100 border-red-250 text-red-800"
															: "bg-amber-100 border-amber-250 text-amber-800"
														}`}>{isLocked ? "LOCKED" : status}</span>
													</div>

													<div className="mt-3">
														{remarks ? (
															<p className={`text-xs leading-relaxed font-medium whitespace-pre-wrap ${
																isLocked ? "text-slate-400"
																: isPass ? "text-emerald-850" 
																: isFail ? "text-red-850" 
																: "text-slate-600"
															}`}>
																&ldquo;{remarks}&rdquo;
															</p>
														) : (
															<p className="text-xs italic text-slate-400 font-medium">No feedback submitted yet</p>
														)}
													</div>

													{canEdit && !isLocked && (
														<div className="mt-4 pt-4 border-t border-slate-100/50 space-y-3">
															{/* Per-round Interviewer Assignment row (HR only) */}
															{admin.role === "hr" && (
																<div className="flex flex-wrap items-center justify-between gap-3">
																	<div className="flex items-center gap-2 min-w-0">
																		<span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Interviewer:</span>
																		{result.assignedInterviewerName ? (
																			<span className="text-[11px] font-bold text-indigo-700 truncate">{result.assignedInterviewerName}</span>
																		) : (
																			<span className="text-[11px] italic text-slate-400">Unassigned</span>
																		)}
																	</div>
																	{/* Inline Combobox */}
																	<div className="relative">
																		<button
																			type="button"
																			disabled={savingRoundInterviewer[key]}
																			onClick={() => setRoundInterviewerOpen(prev => ({ ...prev, [key]: !prev[key] }))}
																			className="h-8 px-3 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
																		>
																			{savingRoundInterviewer[key] ? "Saving…" : "Change ▾"}
																		</button>
																		{roundInterviewerOpen[key] && (
																			<div className="absolute right-0 z-50 mt-1 w-64 overflow-auto max-h-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in duration-100">
																				<input
																					type="text"
																					placeholder="Search interviewer…"
																					value={roundInterviewerSearch[key] ?? ""}
																					onChange={e => setRoundInterviewerSearch(prev => ({ ...prev, [key]: e.target.value }))}
																					className="h-8 w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white"
																				/>
																				<div className="mt-1.5 space-y-0.5">
																					<button
																						type="button"
																						onClick={() => {
																							setRoundInterviewerOpen(prev => ({ ...prev, [key]: false }));
																							saveRoundInterviewer(key, "", "");
																						}}
																						className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-slate-400 hover:bg-slate-50 cursor-pointer"
																					>
																						Remove assignment
																					</button>
																					{staff
																						.filter(u => u.role === "interviewer")
																						.filter(u => {
																							const q = (roundInterviewerSearch[key] ?? "").toLowerCase();
																							return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
																						})
																						.map(user => (
																							<button
																								key={user.user_id}
																								type="button"
																								onClick={() => {
																									setRoundInterviewerOpen(prev => ({ ...prev, [key]: false }));
																									setRoundInterviewerSearch(prev => ({ ...prev, [key]: "" }));
																									saveRoundInterviewer(key, user.email, user.name);
																								}}
																								className={`flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold cursor-pointer transition-colors ${
																									result.assignedInterviewerEmail === user.email ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
																								}`}
																							>
																								<span>{user.name}</span>
																								<span className="text-[10px] font-medium text-slate-400">{user.email}</span>
																							</button>
																						))}
																				</div>
																			</div>
																		)}
																	</div>
																</div>
															)}
															{/* Feedback button row */}
															<div className="flex justify-end">
																<RoundFeedbackDialog
																	label={label}
																	status={status}
																	remarks={remarks}
																	onSave={(newStatus, newRemarks) => saveRound(key, newStatus, newRemarks)}
																	saving={savingRound}
																/>
															</div>
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
				<AdminQuestionReview
					result={result}
					items={items}
					onBack={() => setView("details")}
					onCalculate={(nextResult) => {
						setResult(nextResult);
						setView("details");
					}}
				/>
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
		Promise.resolve().then(() => setNote(remarks));
	}, [remarks]);

	const isFeedbackEmpty = !note || !note.trim();

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
							disabled={saving || isFeedbackEmpty}
							onClick={() => onSave("fail", note)}
							className="h-10 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-bold text-xs cursor-pointer shadow-none w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
							Fail Round
						</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button
							disabled={saving || isFeedbackEmpty}
							onClick={() => onSave("pass", note)}
							className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-md w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
							Pass Round
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
