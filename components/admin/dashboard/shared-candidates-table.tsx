"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Ban, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/layout-primitives";
import { revokeCandidateShareLink } from "@/services/client/candidate-share.service";
import { updateCandidateHiringStatus } from "@/services/client/candidate-hiring-status.service";
import { ApiError } from "@/lib/api-client";
import type { ShareRecord, SharedCandidateSummary } from "@/repositories/candidate-share.repository";

type SharedRow = ShareRecord & { candidate: SharedCandidateSummary | null };

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

function buildShareUrl(token: string) {
	if (typeof window === "undefined") return `/master/admin/${token}`;
	return `${window.location.origin}/master/admin/${token}`;
}

function formatTimestamp(value: string) {
	return new Date(value).toLocaleString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function SharedCandidatesTable({ shares }: { shares: SharedRow[] }) {
	const router = useRouter();
	const [, startTransition] = useTransition();

	const [pageSize, setPageSize] = useState(10);
	const [page, setPage] = useState(0);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [busyAction, setBusyAction] = useState<"revoke" | "hire" | "reject" | null>(null);
	const [rowBusy, setRowBusy] = useState<Set<string>>(new Set());

	const pageCount = Math.max(1, Math.ceil(shares.length / pageSize));
	const currentPage = Math.min(page, pageCount - 1);
	const pageRows = useMemo(
		() => shares.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
		[shares, currentPage, pageSize],
	);

	const pageRowIds = pageRows.map((r) => r.candidateId);
	const allOnPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id));
	const someOnPageSelected = pageRowIds.some((id) => selected.has(id));

	function toggleRow(candidateId: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(candidateId)) next.delete(candidateId);
			else next.add(candidateId);
			return next;
		});
	}

	function toggleSelectAllOnPage() {
		setSelected((prev) => {
			const next = new Set(prev);
			if (allOnPageSelected) {
				pageRowIds.forEach((id) => next.delete(id));
			} else {
				pageRowIds.forEach((id) => next.add(id));
			}
			return next;
		});
	}

	function handlePageSizeChange(value: string) {
		setPageSize(Number(value));
		setPage(0);
	}

	async function handleCopy(token: string) {
		await navigator.clipboard.writeText(buildShareUrl(token));
		toast.success("Link copied to clipboard");
	}

	async function handleRevokeOne(candidateId: string) {
		setRowBusy((prev) => new Set(prev).add(candidateId));
		try {
			await revokeCandidateShareLink(candidateId);
			toast.success("Share link revoked");
			startTransition(() => router.refresh());
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : "Failed to revoke share link");
		} finally {
			setRowBusy((prev) => {
				const next = new Set(prev);
				next.delete(candidateId);
				return next;
			});
		}
	}

	async function handleBulkRevoke() {
		setBusyAction("revoke");
		const ids = Array.from(selected);
		const results = await Promise.allSettled(ids.map((id) => revokeCandidateShareLink(id)));
		const failed = results.filter((r) => r.status === "rejected").length;
		if (failed > 0) {
			toast.error(`Revoked ${ids.length - failed} of ${ids.length} — ${failed} failed`);
		} else {
			toast.success(`Revoked ${ids.length} share link${ids.length === 1 ? "" : "s"}`);
		}
		setSelected(new Set());
		setBusyAction(null);
		startTransition(() => router.refresh());
	}

	async function handleBulkHiringStatus(status: "hired" | "rejected") {
		setBusyAction(status === "hired" ? "hire" : "reject");
		const ids = Array.from(selected);
		const results = await Promise.allSettled(ids.map((id) => updateCandidateHiringStatus(id, status)));
		const failed = results.filter((r) => r.status === "rejected").length;
		const label = status === "hired" ? "Hired" : "Rejected";
		if (failed > 0) {
			toast.error(`${label} ${ids.length - failed} of ${ids.length} — ${failed} failed`);
		} else {
			toast.success(`Marked ${ids.length} candidate${ids.length === 1 ? "" : "s"} as ${status}`);
		}
		setSelected(new Set());
		setBusyAction(null);
		startTransition(() => router.refresh());
	}

	if (shares.length === 0) {
		return <EmptyState title="No active share links" description="Share a candidate profile to see it listed here." />;
	}

	return (
		<div className="space-y-4">
			{selected.size > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5">
					<span className="text-xs font-semibold text-indigo-700">{selected.size} selected</span>
					<div className="ml-auto flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
							disabled={busyAction !== null}
							onClick={() => handleBulkHiringStatus("hired")}
						>
							{busyAction === "hire" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
							Hire Selected
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
							disabled={busyAction !== null}
							onClick={() => handleBulkHiringStatus("rejected")}
						>
							{busyAction === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
							Reject Selected
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
							disabled={busyAction !== null}
							onClick={handleBulkRevoke}
						>
							{busyAction === "revoke" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
							Revoke Selected
						</Button>
					</div>
				</div>
			)}

			<div className="overflow-hidden rounded-lg border border-border">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-xs text-muted-foreground">
						<tr>
							<th className="w-10 px-4 py-2.5">
								<Checkbox
									checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
									onCheckedChange={toggleSelectAllOnPage}
									aria-label="Select all on this page"
								/>
							</th>
							<th className="px-2 py-2.5 text-left font-semibold">Candidate</th>
							<th className="px-2 py-2.5 text-left font-semibold">Created</th>
							<th className="px-2 py-2.5 text-left font-semibold">Expires</th>
							<th className="px-2 py-2.5 text-left font-semibold">Accessed</th>
							<th className="px-2 py-2.5 text-right font-semibold">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{pageRows.map((share) => {
							const isBusy = rowBusy.has(share.candidateId);
							return (
								<tr key={share.id} className="bg-white">
									<td className="px-4 py-3">
										<Checkbox
											checked={selected.has(share.candidateId)}
											onCheckedChange={() => toggleRow(share.candidateId)}
											aria-label={`Select ${share.candidate?.first_name ?? "candidate"}`}
										/>
									</td>
									<td className="px-2 py-3">
										<p className="font-semibold text-brand-navy">
											{share.candidate ? `${share.candidate.first_name} ${share.candidate.last_name}` : "Unknown candidate"}
										</p>
										<p className="text-xs text-muted-foreground">{share.candidate?.email}</p>
									</td>
									<td className="px-2 py-3 text-xs text-muted-foreground">{formatTimestamp(share.createdAt)}</td>
									<td className="px-2 py-3 text-xs text-muted-foreground">{formatTimestamp(share.expiresAt)}</td>
									<td className="px-2 py-3 text-xs text-muted-foreground">
										{share.accessCount} time{share.accessCount === 1 ? "" : "s"}
									</td>
									<td className="px-2 py-3">
										<div className="flex justify-end gap-1.5">
											<Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(share.shareToken)}>
												<Copy className="h-3.5 w-3.5" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="text-red-600 hover:bg-red-50 hover:text-red-700"
												disabled={isBusy}
												onClick={() => handleRevokeOne(share.candidateId)}
											>
												{isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
											</Button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>Rows per page</span>
					<Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
						<SelectTrigger className="h-8 w-20">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PAGE_SIZE_OPTIONS.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span>
						· Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, shares.length)} of {shares.length}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={currentPage === 0}
						onClick={() => setPage((p) => Math.max(0, p - 1))}
					>
						<ChevronLeft className="h-3.5 w-3.5" />
						Prev
					</Button>
					<span className="text-xs text-muted-foreground">
						Page {currentPage + 1} of {pageCount}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={currentPage >= pageCount - 1}
						onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
					>
						Next
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
