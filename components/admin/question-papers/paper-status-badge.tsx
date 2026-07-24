import type { QuestionPaperStatus } from "@/types";

const STATUS_CONFIG: Record<
	QuestionPaperStatus,
	{ label: string; className: string }
> = {
	draft: {
		label: "Draft",
		className: "bg-slate-100 text-slate-600 border-slate-200",
	},
	submitted_for_approval: {
		label: "Submitted",
		className: "bg-amber-50 text-amber-700 border-amber-200",
	},
	rejected: {
		label: "Rejected",
		className: "bg-rose-50 text-rose-700 border-rose-200",
	},
	published: {
		label: "Published",
		className: "bg-emerald-50 text-emerald-700 border-emerald-200",
	},
	archived: {
		label: "Archived",
		className: "bg-slate-100 text-slate-500 border-slate-200",
	},
};

export function PaperStatusBadge({ status }: { status: QuestionPaperStatus }) {
	const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}
		>
			{cfg.label}
		</span>
	);
}
