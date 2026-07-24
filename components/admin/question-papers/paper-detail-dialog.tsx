"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getQuestionPaper } from "@/services/client/question-paper.service";
import type { QuestionPaper, QuestionPaperItem, PaperItemOption } from "@/types";
import { PaperStatusBadge } from "./paper-status-badge";
import { X, CheckCircle2, XCircle, Archive, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type Actor = { userId: string; name: string; role: string };
type ActionFn = (action: "submit" | "approve" | "reject" | "archive", reason?: string) => Promise<void>;

export function PaperDetailDialog({
	paperId,
	actor,
	onClose,
	onAction,
	onDelete,
	actionLoading,
}: {
	paperId: string;
	actor: Actor;
	onClose: () => void;
	onAction: ActionFn;
	onDelete: () => void;
	actionLoading: string | null;
}) {
	const [paper, setPaper] = useState<QuestionPaper | null>(null);
	const [loading, setLoading] = useState(true);
	const [rejectReason, setRejectReason] = useState("");
	const [showRejectForm, setShowRejectForm] = useState(false);
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
	const overlayRef = useRef<HTMLDivElement>(null);

	const isHR = actor.role === "hr";
	const isOwn = paper?.uploadedBy === actor.userId;
	const busy = (action: string) => actionLoading === `${paperId}:${action}`;

	useEffect(() => {
		const fetchPaper = async () => {
			try {
				const data = await getQuestionPaper(paperId);
				setPaper(data);
			} catch (err: any) {
				toast.error(err.message ?? "Could not load paper.");
				onClose();
			} finally {
				setLoading(false);
			}
		};
		void fetchPaper();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paperId]);

	const toggleItem = (id: string) => {
		setExpandedItems((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleReject = async () => {
		if (!rejectReason.trim()) {
			toast.error("A rejection reason is required.");
			return;
		}
		await onAction("reject", rejectReason.trim());
		setShowRejectForm(false);
	};

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
			onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
		>
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-start justify-between p-6 border-b border-slate-100">
					<div className="space-y-1">
						{loading ? (
							<div className="h-6 w-48 bg-slate-100 animate-pulse rounded" />
						) : (
							<>
								<h2 className="text-lg font-bold text-slate-900">{paper?.title}</h2>
								<div className="flex items-center gap-2 flex-wrap">
									{paper && <PaperStatusBadge status={paper.status} />}
									{paper && <span className="text-xs text-slate-500">v{paper.version} · {paper.totalQuestions} questions · {paper.totalMarks} marks</span>}
								</div>
							</>
						)}
					</div>
					<button type="button" onClick={onClose}
						className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{loading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
						</div>
					) : paper ? (
						<>
							{/* Rejection reason banner */}
							{paper.status === "rejected" && paper.rejectionReason && (
								<div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
									<p className="text-sm font-semibold text-rose-700 mb-1">Rejected by HR</p>
									<p className="text-sm text-rose-600">{paper.rejectionReason}</p>
								</div>
							)}

							{/* Meta grid */}
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
								<div>
									<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Uploaded by</p>
									<p className="text-slate-800 font-medium">{paper.uploadedByName}</p>
								</div>
								{paper.approvedByName && (
									<div>
										<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Approved by</p>
										<p className="text-slate-800 font-medium">{paper.approvedByName}</p>
									</div>
								)}
								{paper.publishedAt && (
									<div>
										<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Published</p>
										<p className="text-slate-800 font-medium">{new Date(paper.publishedAt).toLocaleDateString()}</p>
									</div>
								)}
								<div>
									<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Created</p>
									<p className="text-slate-800 font-medium">{new Date(paper.createdAt).toLocaleDateString()}</p>
								</div>
							</div>

							{/* Questions */}
							<div>
								<h3 className="text-sm font-semibold text-slate-700 mb-3">
									Questions ({paper.items?.length ?? paper.totalQuestions})
								</h3>
								<div className="space-y-2">
									{(paper.items ?? []).map((item: QuestionPaperItem, idx: number) => (
										<QuestionAccordion
											key={item.id}
											item={item}
											idx={idx}
											expanded={expandedItems.has(item.id)}
											onToggle={() => toggleItem(item.id)}
										/>
									))}
								</div>
							</div>
						</>
					) : null}
				</div>

				{/* Footer actions */}
				{!loading && paper && (
					<div className="border-t border-slate-100 p-4 flex flex-wrap items-center gap-2 justify-end">
						{/* Submit (own draft/rejected) */}
						{(paper.status === "draft" || paper.status === "rejected") && (isOwn || isHR) && (
							<button type="button"
								onClick={() => onAction("submit")}
								disabled={busy("submit")}
								className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50">
								<Send className="h-4 w-4" />
								Submit for Approval
							</button>
						)}

						{/* HR approve */}
						{isHR && paper.status === "submitted_for_approval" && (
							<button type="button"
								onClick={() => onAction("approve")}
								disabled={busy("approve")}
								className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50">
								<CheckCircle2 className="h-4 w-4" />
								Approve & Publish
							</button>
						)}

						{/* HR reject */}
						{isHR && paper.status === "submitted_for_approval" && (
							<>
								{showRejectForm ? (
									<div className="flex items-center gap-2 flex-1">
										<input
											type="text"
											value={rejectReason}
											onChange={(e) => setRejectReason(e.target.value)}
											placeholder="Rejection reason (required)…"
											className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
										/>
										<button type="button" onClick={handleReject} disabled={busy("reject")}
											className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50">
											<XCircle className="h-4 w-4" />
											Confirm Reject
										</button>
										<button type="button" onClick={() => setShowRejectForm(false)}
											className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
											Cancel
										</button>
									</div>
								) : (
									<button type="button"
										onClick={() => setShowRejectForm(true)}
										className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer">
										<XCircle className="h-4 w-4" />
										Reject
									</button>
								)}
							</>
						)}

						{/* HR archive */}
						{isHR && paper.status === "published" && (
							<button type="button"
								onClick={() => onAction("archive")}
								disabled={busy("archive")}
								className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50">
								<Archive className="h-4 w-4" />
								Archive
							</button>
						)}

						<button type="button" onClick={onClose}
							className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
							Close
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function QuestionAccordion({
	item,
	idx,
	expanded,
	onToggle,
}: {
	item: QuestionPaperItem;
	idx: number;
	expanded: boolean;
	onToggle: () => void;
}) {
	const typeColors: Record<string, string> = {
		mcq_single: "bg-blue-50 text-blue-700",
		mcq_multi: "bg-violet-50 text-violet-700",
		output_prediction: "bg-cyan-50 text-cyan-700",
		coding: "bg-orange-50 text-orange-700",
		sql: "bg-teal-50 text-teal-700",
		subjective: "bg-pink-50 text-pink-700",
	};

	return (
		<div className="rounded-xl border border-slate-100 overflow-hidden">
			<button
				type="button"
				onClick={onToggle}
				className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
			>
				<div className="flex items-center gap-3 min-w-0">
					<span className="shrink-0 text-xs font-bold text-slate-400 w-6 text-right">{idx + 1}.</span>
					<span
						className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeColors[item.questionType] ?? "bg-slate-100 text-slate-600"}`}
					>
						{item.questionType.replace(/_/g, " ")}
					</span>
					<span className="text-sm text-slate-800 truncate">{item.questionText}</span>
					<span className="shrink-0 text-xs text-slate-400 ml-auto">{item.marks} mk</span>
				</div>
				<span className="ml-3 shrink-0 text-slate-400">
					{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
				</span>
			</button>

			{expanded && (
				<div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/40">
					<p className="text-sm text-slate-700">{item.questionText}</p>
					{item.codeLanguage && (
						<p className="text-xs text-slate-500">Language: <span className="font-medium text-slate-700">{item.codeLanguage}</span></p>
					)}
					{item.section && (
						<p className="text-xs text-slate-500">Section: <span className="font-medium text-slate-700">{item.section}</span></p>
					)}

					{/* Options with correct answers highlighted — HR/Interviewer only, candidates never see this */}
					{item.options && item.options.length > 0 && (
						<div className="space-y-1.5">
							<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</p>
							{(item.options as PaperItemOption[]).map((opt) => (
								<div
									key={opt.key}
									className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
										opt.isCorrect
											? "bg-emerald-50 border border-emerald-200 text-emerald-800"
											: "bg-white border border-slate-100 text-slate-700"
									}`}
								>
									<span className="font-bold shrink-0 w-5">{opt.key}.</span>
									<span className="flex-1">{opt.text}</span>
									{opt.isCorrect && (
										<CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
									)}
								</div>
							))}
						</div>
					)}

					{/* Expected answer */}
					{item.expectedAnswer && (
						<div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
							<p className="text-xs font-semibold text-emerald-700 mb-1 uppercase tracking-wide">Expected Answer</p>
							<p className="text-sm text-emerald-800 whitespace-pre-wrap">{item.expectedAnswer}</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
