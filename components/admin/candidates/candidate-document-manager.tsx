"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Upload, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SectionCard } from "@/components/ui/enterprise-primitives";
import {
	uploadCandidateDocument,
	deleteCandidateDocument,
	getCandidateDocumentUrl,
	type CandidateDocumentType,
} from "@/services/client/candidate-document.service";
import { ApiError } from "@/lib/api-client";
import type { DocumentStatusMap } from "@/repositories/candidate-document.repository";

const DOC_CONFIG: Record<CandidateDocumentType, { label: string; icon: typeof FileText; accept: string }> = {
	resume: { label: "Resume", icon: FileText, accept: ".pdf,.doc,.docx" },
	application_form: { label: "Application Form", icon: FileText, accept: ".pdf,.doc,.docx" },
	passport_photo: { label: "Passport Photo", icon: ImageIcon, accept: "image/jpeg,image/png,image/webp" },
};

export type { DocumentStatusMap } from "@/repositories/candidate-document.repository";

function formatDate(value: string | null) {
	if (!value) return "";
	return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function DocumentRow({
	candidateId,
	type,
	status,
	canManage,
	onChange,
}: {
	candidateId: string;
	type: CandidateDocumentType;
	status: { uploaded: boolean; uploadedAt: string | null };
	canManage: boolean;
	onChange: (next: { uploaded: boolean; uploadedAt: string | null }) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);
	const [viewing, setViewing] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const config = DOC_CONFIG[type];
	const Icon = config.icon;

	async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		setUploading(true);
		try {
			const res = await uploadCandidateDocument(candidateId, type, file);
			onChange({ uploaded: res.status.uploaded, uploadedAt: res.status.uploadedAt });
			toast.success(`${config.label} uploaded`);
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : `Failed to upload ${config.label.toLowerCase()}`);
		} finally {
			setUploading(false);
		}
	}

	async function handleView() {
		setViewing(true);
		try {
			const res = await getCandidateDocumentUrl(candidateId, type);
			window.open(res.url, "_blank", "noopener,noreferrer");
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : `Failed to open ${config.label.toLowerCase()}`);
		} finally {
			setViewing(false);
		}
	}

	async function handleDelete() {
		setDeleting(true);
		try {
			await deleteCandidateDocument(candidateId, type);
			onChange({ uploaded: false, uploadedAt: null });
			toast.success(`${config.label} deleted`);
		} catch (error) {
			toast.error(error instanceof ApiError ? error.message : `Failed to delete ${config.label.toLowerCase()}`);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-white px-4 py-3">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
					<Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-foreground">{config.label}</p>
					<p className="truncate text-xs text-muted-foreground">
						{status.uploaded ? `Uploaded ${formatDate(status.uploadedAt)}` : "Not uploaded"}
					</p>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1.5">
				{status.uploaded && (
					<Button type="button" variant="ghost" size="sm" onClick={handleView} disabled={viewing}>
						{viewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
					</Button>
				)}

				{canManage && (
					<>
						<input
							ref={inputRef}
							type="file"
							accept={config.accept}
							className="hidden"
							onChange={handleFileSelected}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => inputRef.current?.click()}
							disabled={uploading}
						>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
						</Button>

						{status.uploaded && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-red-600 hover:bg-red-50 hover:text-red-700"
										disabled={deleting}
									>
										{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete {config.label}?</AlertDialogTitle>
										<AlertDialogDescription>
											This permanently removes the file from storage. This cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export function CandidateDocumentManager({
	candidateId,
	initialStatus,
	canManage,
}: {
	candidateId: string;
	initialStatus: DocumentStatusMap;
	canManage: boolean;
}) {
	const [status, setStatus] = useState<DocumentStatusMap>(initialStatus);

	return (
		<SectionCard title="Documents">
			<div className="space-y-2.5">
				{(Object.keys(DOC_CONFIG) as CandidateDocumentType[]).map((type) => (
					<DocumentRow
						key={type}
						candidateId={candidateId}
						type={type}
						status={status[type]}
						canManage={canManage}
						onChange={(next) => setStatus((prev) => ({ ...prev, [type]: next }))}
					/>
				))}
			</div>
		</SectionCard>
	);
}
