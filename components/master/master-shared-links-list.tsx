"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeCandidateShareLink } from "@/services/client/candidate-share.service";
import { ApiError } from "@/lib/api-client";
import type { ShareRecord } from "@/repositories/candidate-share.repository";

type SharedRow = ShareRecord & { candidate: { id: string; first_name: string; last_name: string; email: string } | null };

function buildShareUrl(token: string) {
	if (typeof window === "undefined") return `/master/admin/${token}`;
	return `${window.location.origin}/master/admin/${token}`;
}

export function MasterSharedLinksList({ shares }: { shares: SharedRow[] }) {
	const router = useRouter();
	const [pending, setPending] = useState<string | null>(null);
	const [, startTransition] = useTransition();

	async function handleCopy(token: string) {
		await navigator.clipboard.writeText(buildShareUrl(token));
		toast.success("Link copied to clipboard");
	}

	async function handleRevoke(candidateId: string) {
		setPending(candidateId);
		try {
			await revokeCandidateShareLink(candidateId);
			toast.success("Share link revoked");
			startTransition(() => router.refresh());
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : "Failed to revoke share link");
		} finally {
			setPending(null);
		}
	}

	if (shares.length === 0) {
		return <p className="text-sm text-muted-foreground">No active share links yet.</p>;
	}

	return (
		<ul className="divide-y divide-border rounded-lg border border-border">
			{shares.map((share) => (
				<li key={share.id} className="flex items-center justify-between gap-4 px-4 py-3">
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-brand-navy">
							{share.candidate ? `${share.candidate.first_name} ${share.candidate.last_name}` : "Unknown candidate"}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							Expires {new Date(share.expiresAt).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(share.shareToken)}>
							<Copy className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
							disabled={pending === share.candidateId}
							onClick={() => handleRevoke(share.candidateId)}
						>
							{pending === share.candidateId ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Ban className="h-3.5 w-3.5" />
							)}
						</Button>
					</div>
				</li>
			))}
		</ul>
	);
}
