"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
	validateQuestionPaper,
	uploadQuestionPaper,
	downloadQuestionPaperTemplate,
} from "@/services/client/question-paper.service";
import { X, Upload, Download, FileX2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Actor = { userId: string; name: string; role: string };

interface MetaOption { id: string; value: string; label: string; }

export function UploadPaperDialog({
	actor,
	onClose,
	onSuccess,
}: {
	actor: Actor;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const [roles, setRoles] = useState<MetaOption[]>([]);
	const [experiences, setExperiences] = useState<MetaOption[]>([]);
	const [roleId, setRoleId] = useState("");
	const [experienceId, setExperienceId] = useState("");
	const [title, setTitle] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [validation, setValidation] = useState<{
		valid: boolean;
		errors: string[];
		summary: { totalQuestions: number; totalMarks: number; questionCountByType: Record<string, number> } | null;
	} | null>(null);
	const [validating, setValidating] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [downloadingTemplate, setDownloadingTemplate] = useState(false);
	const overlayRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const fetchMeta = async () => {
			try {
				const res = await fetch("/api/admin/question-papers/metadata");
				const json = await res.json();
				if (json.success) {
					setRoles(json.data?.roles ?? []);
					setExperiences(json.data?.experiences ?? []);
				}
			} catch {
				// Non-fatal: user can still type
			}
		};
		void fetchMeta();
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0] ?? null;
		setFile(f);
		setValidation(null);
	};

	const handleValidate = async () => {
		if (!file) { toast.error("Please select a file first."); return; }
		setValidating(true);
		try {
			const result = await validateQuestionPaper(file);
			setValidation(result);
			if (result.valid) toast.success("Validation passed. Ready to save.");
			else toast.error(`${result.errors.length} validation error(s) found.`);
		} catch (err: any) {
			toast.error(err.message ?? "Validation failed.");
		} finally {
			setValidating(false);
		}
	};

	const handleUpload = async (submitForApproval = false) => {
		if (!file || !roleId || !experienceId || !title.trim()) {
			toast.error("Please fill in all required fields and select a file.");
			return;
		}
		if (!validation?.valid) {
			toast.error("Please validate the file first and fix any errors.");
			return;
		}
		setUploading(true);
		try {
			const result = await uploadQuestionPaper(file, roleId, experienceId, title.trim());
			if (result.errors.length > 0 || !result.paper) {
				setValidation({ valid: false, errors: result.errors, summary: null });
				toast.error(`${result.errors.length} server-side error(s) found.`);
				return;
			}
			if (submitForApproval && result.paper) {
				// Submit immediately after creating draft
				const { paperAction } = await import("@/services/client/question-paper.service");
				await paperAction(result.paper.id, "submit");
				toast.success(`"${title}" saved and submitted for HR approval.`);
			} else {
				toast.success(`"${title}" saved as draft.`);
			}
			onSuccess();
		} catch (err: any) {
			toast.error(err.message ?? "Upload failed.");
		} finally {
			setUploading(false);
		}
	};

	const handleTemplateDownload = async () => {
		setDownloadingTemplate(true);
		try {
			await downloadQuestionPaperTemplate();
		} catch (err: any) {
			toast.error(err.message ?? "Could not download template.");
		} finally {
			setDownloadingTemplate(false);
		}
	};

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
			onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
		>
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-100">
					<div>
						<h2 className="text-lg font-bold text-slate-900">Upload Question Paper</h2>
						<p className="text-xs text-slate-500 mt-0.5">Download the template, fill it in, then upload here.</p>
					</div>
					<button type="button" onClick={onClose}
						className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					{/* Step 0: Download template */}
					<div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 flex items-center gap-3">
						<Download className="h-5 w-5 text-indigo-500 shrink-0" />
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold text-indigo-800">Download Excel Template</p>
							<p className="text-xs text-indigo-600">Use the official template to avoid validation errors.</p>
						</div>
						<button type="button" onClick={handleTemplateDownload} disabled={downloadingTemplate}
							className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50">
							{downloadingTemplate ? "…" : "Download"}
						</button>
					</div>

					{/* Title */}
					<div>
						<label className="block text-sm font-semibold text-slate-700 mb-1.5">Paper Title <span className="text-rose-500">*</span></label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. ReactJS Developer — Mid Level (July 2026)"
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					{/* Role select */}
					<div>
						<label className="block text-sm font-semibold text-slate-700 mb-1.5">Role <span className="text-rose-500">*</span></label>
						<select
							value={roleId}
							onChange={(e) => setRoleId(e.target.value)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">Select a role…</option>
							{roles.map((r) => (
								<option key={r.id} value={r.id}>{r.label ?? r.value}</option>
							))}
						</select>
					</div>

					{/* Experience select */}
					<div>
						<label className="block text-sm font-semibold text-slate-700 mb-1.5">Experience <span className="text-rose-500">*</span></label>
						<select
							value={experienceId}
							onChange={(e) => setExperienceId(e.target.value)}
							className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">Select experience…</option>
							{experiences.map((e) => (
								<option key={e.id} value={e.id}>{e.label ?? e.value}</option>
							))}
						</select>
					</div>

					{/* File picker */}
					<div>
						<label className="block text-sm font-semibold text-slate-700 mb-1.5">Excel File (.xlsx) <span className="text-rose-500">*</span></label>
						<div
							className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="h-8 w-8 text-slate-300 mb-2" />
							{file ? (
								<p className="text-sm font-medium text-slate-700">{file.name}</p>
							) : (
								<>
									<p className="text-sm font-medium text-slate-600">Click to select or drag & drop</p>
									<p className="text-xs text-slate-400 mt-1">Only .xlsx files, max 5 MB</p>
								</>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								onChange={handleFileChange}
								className="hidden"
							/>
						</div>
					</div>

					{/* Validation result */}
					{file && !validation && (
						<button type="button" onClick={handleValidate} disabled={validating}
							className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50">
							{validating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							{validating ? "Validating…" : "Validate File"}
						</button>
					)}

					{validation && (
						<div className={`rounded-xl border p-4 space-y-3 ${validation.valid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
							<div className="flex items-center gap-2">
								{validation.valid ? (
									<CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
								) : (
									<FileX2 className="h-5 w-5 text-rose-600 shrink-0" />
								)}
								<span className={`text-sm font-semibold ${validation.valid ? "text-emerald-800" : "text-rose-800"}`}>
									{validation.valid ? "Validation passed" : `${validation.errors.length} error(s) found`}
								</span>
							</div>

							{validation.summary && (
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="rounded-lg bg-white/60 p-2.5 text-center">
										<p className="font-bold text-lg text-emerald-700">{validation.summary.totalQuestions}</p>
										<p className="text-slate-500">questions</p>
									</div>
									<div className="rounded-lg bg-white/60 p-2.5 text-center">
										<p className="font-bold text-lg text-emerald-700">{validation.summary.totalMarks}</p>
										<p className="text-slate-500">total marks</p>
									</div>
									{Object.entries(validation.summary.questionCountByType).map(([type, count]) => (
										<div key={type} className="rounded-lg bg-white/60 p-2 text-center">
											<p className="font-semibold text-slate-700">{count as number}</p>
											<p className="text-slate-400 text-[10px]">{type.replace(/_/g, " ")}</p>
										</div>
									))}
								</div>
							)}

							{validation.errors.length > 0 && (
								<ul className="space-y-1">
									{validation.errors.map((err, i) => (
										<li key={i} className="flex items-start gap-2 text-xs text-rose-700">
											<AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
											{err}
										</li>
									))}
								</ul>
							)}

							{!validation.valid && (
								<button type="button" onClick={handleValidate} disabled={validating}
									className="w-full text-center text-xs text-rose-600 hover:text-rose-800 font-medium cursor-pointer">
									Re-validate after fixing errors
								</button>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-slate-100 p-4 flex flex-wrap gap-2 justify-end">
					<button type="button" onClick={onClose}
						className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
						Cancel
					</button>
					<button type="button" onClick={() => handleUpload(false)} disabled={uploading || !validation?.valid}
						className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50">
						{uploading ? "Saving…" : "Save as Draft"}
					</button>
					<button type="button" onClick={() => handleUpload(true)} disabled={uploading || !validation?.valid}
						className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50">
						<Upload className="h-4 w-4" />
						{uploading ? "Submitting…" : "Submit for Approval"}
					</button>
				</div>
			</div>
		</div>
	);
}
