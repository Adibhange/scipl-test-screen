"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
	listQuestionPapers,
	downloadQuestionPaperTemplate,
	deleteQuestionPaper,
	paperAction,
} from "@/services/client/question-paper.service";
import type { QuestionPaper, QuestionPaperStatus } from "@/types";
import { PaperStatusBadge } from "./paper-status-badge";
import { UploadPaperDialog } from "./upload-paper-dialog";
import { PaperDetailDialog } from "./paper-detail-dialog";
import {
	FileText,
	Upload,
	Download,
	RefreshCw,
	Trash2,
	Eye,
	CheckCircle,
	XCircle,
	Archive,
	Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Actor = { userId: string; name: string; role: string };

export function QuestionPapersPage({ actor }: { actor: Actor }) {
	const [papers, setPapers] = useState<QuestionPaper[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
	const [showUpload, setShowUpload] = useState(false);
	const [downloadingTemplate, setDownloadingTemplate] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<QuestionPaperStatus | "all">("all");
	const [search, setSearch] = useState("");
	const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const isHR = actor.role === "hr";

	const fetchPapers = async () => {
		try {
			setLoading(true);
			const data = await listQuestionPapers();
			setPapers(data);
		} catch (err: any) {
			toast.error(err.message ?? "Could not load question papers.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void fetchPapers();
		return () => { if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current); };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleTemplateDownload = async () => {
		setDownloadingTemplate(true);
		try {
			await downloadQuestionPaperTemplate();
			toast.success("Template downloaded successfully.");
		} catch (err: any) {
			toast.error(err.message ?? "Could not download template.");
		} finally {
			setDownloadingTemplate(false);
		}
	};

	const handleAction = async (paper: QuestionPaper, action: "submit" | "approve" | "reject" | "archive", reason?: string) => {
		setActionLoading(`${paper.id}:${action}`);
		try {
			await paperAction(paper.id, action, reason);
			const messages: Record<string, string> = {
				submit: `"${paper.title}" submitted for HR approval.`,
				approve: `"${paper.title}" approved and published.`,
				reject: `"${paper.title}" rejected.`,
				archive: `"${paper.title}" archived.`,
			};
			toast.success(messages[action]);
			void fetchPapers();
			if (selectedPaper?.id === paper.id) setSelectedPaper(null);
		} catch (err: any) {
			toast.error(err.message ?? "Action failed.");
		} finally {
			setActionLoading(null);
		}
	};

	const handleDelete = async (paper: QuestionPaper) => {
		if (!confirm(`Delete "${paper.title}"? This cannot be undone.`)) return;
		setActionLoading(`${paper.id}:delete`);
		try {
			await deleteQuestionPaper(paper.id);
			toast.success(`"${paper.title}" deleted.`);
			void fetchPapers();
			if (selectedPaper?.id === paper.id) setSelectedPaper(null);
		} catch (err: any) {
			toast.error(err.message ?? "Could not delete paper.");
		} finally {
			setActionLoading(null);
		}
	};

	const filtered = papers.filter((p) => {
		if (statusFilter !== "all" && p.status !== statusFilter) return false;
		if (search) {
			const q = search.toLowerCase();
			if (!p.title.toLowerCase().includes(q)) return false;
		}
		return true;
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
						<FileText className="h-6 w-6 text-indigo-600" />
						Question Papers
					</h1>
					<p className="text-sm text-slate-500 mt-0.5">
						{isHR ? "Manage and publish assessment question papers." : "Upload and manage your question papers for HR review."}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={handleTemplateDownload}
						disabled={downloadingTemplate}
						className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
					>
						<Download className="h-4 w-4" />
						{downloadingTemplate ? "Downloading..." : "Excel Template"}
					</button>
					<button
						type="button"
						onClick={() => setShowUpload(true)}
						className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors cursor-pointer"
					>
						<Upload className="h-4 w-4" />
						Upload Paper
					</button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-3">
				<input
					type="text"
					placeholder="Search by title..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value as QuestionPaperStatus | "all")}
					className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="all">All statuses</option>
					<option value="draft">Draft</option>
					<option value="submitted_for_approval">Submitted</option>
					<option value="published">Published</option>
					<option value="rejected">Rejected</option>
					<option value="archived">Archived</option>
				</select>
				<button
					type="button"
					onClick={() => void fetchPapers()}
					disabled={loading}
					className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
				>
					<RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
				</button>
			</div>

			{/* Table */}
			<div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
				{loading ? (
					<div className="p-12 text-center text-slate-500 text-sm">Loading papers…</div>
				) : filtered.length === 0 ? (
					<div className="p-12 text-center space-y-3">
						<FileText className="h-10 w-10 mx-auto text-slate-300" />
						<p className="text-slate-500 text-sm font-medium">No question papers found.</p>
						<p className="text-slate-400 text-xs">Upload a paper using the button above.</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
									<th className="text-left px-4 py-3">Title</th>
									<th className="text-left px-4 py-3">Status</th>
									<th className="text-left px-4 py-3 hidden sm:table-cell">Questions</th>
									<th className="text-left px-4 py-3 hidden md:table-cell">Marks</th>
									<th className="text-left px-4 py-3 hidden lg:table-cell">Uploaded by</th>
									<th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
									<th className="text-right px-4 py-3">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50">
								{filtered.map((paper) => (
									<PaperRow
										key={paper.id}
										paper={paper}
										actor={actor}
										actionLoading={actionLoading}
										onView={() => setSelectedPaper(paper)}
										onAction={handleAction}
										onDelete={handleDelete}
									/>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Dialogs */}
			{showUpload && (
				<UploadPaperDialog
					actor={actor}
					onClose={() => setShowUpload(false)}
					onSuccess={() => { setShowUpload(false); void fetchPapers(); }}
				/>
			)}
			{selectedPaper && (
				<PaperDetailDialog
					paperId={selectedPaper.id}
					actor={actor}
					onClose={() => setSelectedPaper(null)}
					onAction={async (action, reason) => {
						await handleAction(selectedPaper, action, reason);
					}}
					onDelete={() => handleDelete(selectedPaper)}
					actionLoading={actionLoading}
				/>
			)}
		</div>
	);
}

function PaperRow({
	paper,
	actor,
	actionLoading,
	onView,
	onAction,
	onDelete,
}: {
	paper: QuestionPaper;
	actor: Actor;
	actionLoading: string | null;
	onView: () => void;
	onAction: (paper: QuestionPaper, action: "submit" | "approve" | "reject" | "archive", reason?: string) => Promise<void>;
	onDelete: (paper: QuestionPaper) => Promise<void>;
}) {
	const isHR = actor.role === "hr";
	const isOwn = paper.uploadedBy === actor.userId;
	const busy = (action: string) => actionLoading === `${paper.id}:${action}`;

	return (
		<tr className="hover:bg-slate-50/60 transition-colors group">
			<td className="px-4 py-3 font-medium text-slate-900 max-w-50 truncate">{paper.title}</td>
			<td className="px-4 py-3">
				<PaperStatusBadge status={paper.status} />
				{paper.status === "rejected" && paper.rejectionReason && (
					<p className="text-[10px] text-rose-500 mt-0.5 max-w-40 truncate" title={paper.rejectionReason}>
						{paper.rejectionReason}
					</p>
				)}
			</td>
			<td className="px-4 py-3 hidden sm:table-cell text-slate-600">{paper.totalQuestions}</td>
			<td className="px-4 py-3 hidden md:table-cell text-slate-600">{paper.totalMarks}</td>
			<td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{paper.uploadedByName}</td>
			<td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
				{new Date(paper.createdAt).toLocaleDateString()}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-1 justify-end">
					<button type="button" onClick={onView} title="View paper"
						className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer">
						<Eye className="h-3.5 w-3.5" />
					</button>

					{/* Submit (own draft/rejected by interviewer or HR) */}
					{(paper.status === "draft" || paper.status === "rejected") && (isOwn || isHR) && (
						<button type="button" onClick={() => onAction(paper, "submit")} disabled={busy("submit")} title="Submit for approval"
							className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer disabled:opacity-50">
							<Send className="h-3.5 w-3.5" />
						</button>
					)}

					{/* Approve (HR only, submitted) */}
					{isHR && paper.status === "submitted_for_approval" && (
						<button type="button" onClick={() => onAction(paper, "approve")} disabled={busy("approve")} title="Approve and publish"
							className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer disabled:opacity-50">
							<CheckCircle className="h-3.5 w-3.5" />
						</button>
					)}

					{/* Reject (HR only, submitted) */}
					{isHR && paper.status === "submitted_for_approval" && (
						<button type="button"
							onClick={() => {
								const reason = prompt("Rejection reason (required):");
								if (reason?.trim()) void onAction(paper, "reject", reason.trim());
							}}
							disabled={busy("reject")} title="Reject"
							className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50">
							<XCircle className="h-3.5 w-3.5" />
						</button>
					)}

					{/* Archive (HR only, published) */}
					{isHR && paper.status === "published" && (
						<button type="button" onClick={() => onAction(paper, "archive")} disabled={busy("archive")} title="Archive"
							className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-50">
							<Archive className="h-3.5 w-3.5" />
						</button>
					)}

					{/* Delete (draft/rejected: own or HR) */}
					{(paper.status === "draft" || paper.status === "rejected") && (isOwn || isHR) && (
						<button type="button" onClick={() => onDelete(paper)} disabled={busy("delete")} title="Delete"
							className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50">
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
			</td>
		</tr>
	);
}
