"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ShareCandidateDialog } from "@/components/master/share-candidate-dialog";
import { StatusBadge, type StatusVariant } from "@/components/ui/enterprise-primitives";

export type MasterCandidateRow = {
	id: string;
	name: string;
	email: string;
	mobile: string;
	role: string;
	hiringStatus?: string;
	submittedAt: string;
};

export function MasterCandidateBrowser({
	candidates,
	mode,
}: {
	candidates: MasterCandidateRow[];
	mode: "search" | "recent";
}) {
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		if (mode === "recent") return candidates.slice(0, 5);
		if (!query.trim()) return [];
		const q = query.trim().toLowerCase();
		return candidates.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.email.toLowerCase().includes(q) ||
				c.mobile.includes(q),
		);
	}, [candidates, query, mode]);

	return (
		<div className="space-y-3">
			{mode === "search" && (
				<div className="relative max-w-md">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search by name, email, or mobile number"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="h-11 pl-9"
					/>
				</div>
			)}

			{mode === "search" && !query.trim() ? (
				<p className="text-sm text-muted-foreground">Start typing to search candidates.</p>
			) : filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{mode === "recent" ? "No candidates yet." : "No candidates match your search."}
				</p>
			) : (
				<ul className="divide-y divide-border rounded-lg border border-border">
					{filtered.map((c) => (
						<li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-brand-navy">{c.name}</p>
								<p className="truncate text-xs text-muted-foreground">
									{c.email} · {c.mobile}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-3">
								{c.hiringStatus && (
									<StatusBadge variant={c.hiringStatus as StatusVariant} />
								)}
								<ShareCandidateDialog candidateId={c.id} candidateName={c.name} />
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
