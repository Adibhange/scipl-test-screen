"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2, Copy, Ban, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	getCandidateShareStatus,
	generateCandidateShareLink,
	revokeCandidateShareLink,
} from "@/services/client/candidate-share.service";
import type { ShareRecord, ShareValidityHours } from "@/repositories/candidate-share.repository";
import { ApiError } from "@/lib/api-client";

const VALIDITY_OPTIONS: { value: ShareValidityHours; label: string }[] = [
	{ value: 1, label: "1 Hour" },
	{ value: 12, label: "12 Hours" },
	{ value: 24, label: "24 Hours" },
];

function formatTimestamp(value: string) {
	return new Date(value).toLocaleString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function buildShareUrl(token: string) {
	if (typeof window === "undefined") return `/master/admin/${token}`;
	return `${window.location.origin}/master/admin/${token}`;
}

export function ShareCandidateDialog({
	candidateId,
	candidateName,
}: {
	candidateId: string;
	candidateName: string;
}) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [share, setShare] = useState<ShareRecord | null>(null);
	const [validity, setValidity] = useState<ShareValidityHours>(12);

	useEffect(() => {
		if (!open) return;
		let active = true;

		async function load() {
			setLoading(true);
			try {
				const res = await getCandidateShareStatus(candidateId);
				if (active) setShare(res.share);
			} catch {
				if (active) toast.error("Could not load share link status");
			} finally {
				if (active) setLoading(false);
			}
		}

		void load();
		return () => {
			active = false;
		};
	}, [open, candidateId]);

	async function handleGenerate() {
		setBusy(true);
		try {
			const res = await generateCandidateShareLink(candidateId, validity);
			setShare(res.share);
			toast.success("Share link generated");
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : "Failed to generate share link");
		} finally {
			setBusy(false);
		}
	}

	async function handleRevoke() {
		setBusy(true);
		try {
			const res = await revokeCandidateShareLink(candidateId);
			setShare(res.share);
			toast.success("Share link revoked");
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : "Failed to revoke share link");
		} finally {
			setBusy(false);
		}
	}

	async function handleCopy() {
		if (!share) return;
		await navigator.clipboard.writeText(buildShareUrl(share.shareToken));
		toast.success("Link copied to clipboard");
	}

	const isActive = share?.status === "active";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2 rounded-xl h-10 px-4">
					<Share2 className="h-4 w-4" />
					Share
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share Candidate</DialogTitle>
					<DialogDescription>{candidateName}</DialogDescription>
				</DialogHeader>

				{loading ? (
					<div className="flex items-center justify-center py-8 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
					</div>
				) : isActive && share ? (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
								<CheckCircle2 className="h-3.5 w-3.5" /> Active
							</Badge>
							<span className="text-xs text-muted-foreground">Validity: {share.validityHours} hours</span>
						</div>

						<dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Created by</dt>
								<dd className="font-medium">{share.createdBy}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Created</dt>
								<dd className="font-medium">{formatTimestamp(share.createdAt)}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Expires</dt>
								<dd className="font-medium">{formatTimestamp(share.expiresAt)}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Accessed</dt>
								<dd className="font-medium">
									{share.accessCount} time{share.accessCount === 1 ? "" : "s"}
									{share.lastAccessedAt ? ` · last ${formatTimestamp(share.lastAccessedAt)}` : ""}
								</dd>
							</div>
						</dl>

						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Share URL</Label>
							<div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs">
								<span className="flex-1 truncate font-mono">{buildShareUrl(share.shareToken)}</span>
							</div>
						</div>

						<div className="flex gap-2">
							<Button type="button" variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
								<Copy className="h-4 w-4" /> Copy Link
							</Button>
							<Button
								type="button"
								variant="outline"
								className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
								onClick={handleRevoke}
								disabled={busy}
							>
								{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
								Revoke Link
							</Button>
						</div>

						<Button type="button" variant="ghost" className="w-full text-muted-foreground" disabled>
							Generate New Link (disabled until current link is revoked)
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						{share?.status === "revoked" && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<XCircle className="h-3.5 w-3.5 text-red-500" />
								Previous link revoked by {share.revokedBy || "unknown"}
								{share.revokedAt ? ` on ${formatTimestamp(share.revokedAt)}` : ""}.
							</div>
						)}
						{share?.status === "expired" && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<XCircle className="h-3.5 w-3.5 text-amber-500" />
								Previous link expired{share.expiresAt ? ` on ${formatTimestamp(share.expiresAt)}` : ""}.
							</div>
						)}

						<div className="space-y-2">
							<Label className="text-sm">Link Validity</Label>
							<RadioGroup
								value={String(validity)}
								onValueChange={(v) => setValidity(Number(v) as ShareValidityHours)}
								className="gap-2"
							>
								{VALIDITY_OPTIONS.map((opt) => (
									<div key={opt.value} className="flex items-center gap-2">
										<RadioGroupItem value={String(opt.value)} id={`validity-${opt.value}`} />
										<Label htmlFor={`validity-${opt.value}`} className="font-normal">
											{opt.label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>

						<Button type="button" className="w-full gap-2" onClick={handleGenerate} disabled={busy}>
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
							Generate Share Link
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
