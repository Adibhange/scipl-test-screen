import { getSupabaseServerClient } from "@/database/adapters/supabase";
import { ValidationError } from "@/lib/errors";

export const CANDIDATE_DOCUMENTS_BUCKET = "candidate-documents";

export type CandidateDocumentType = "resume" | "application_form" | "passport_photo";

const ALLOWED_MIME_TYPES: Record<CandidateDocumentType, string[]> = {
	resume: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
	application_form: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
	passport_photo: ["image/jpeg", "image/png", "image/webp"],
};

const MAX_SIZE_BYTES: Record<CandidateDocumentType, number> = {
	resume: 5 * 1024 * 1024,
	application_form: 5 * 1024 * 1024,
	passport_photo: 2 * 1024 * 1024,
};

const EXTENSION_BY_MIME: Record<string, string> = {
	"application/pdf": "pdf",
	"application/msword": "doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

export const DOCUMENT_COLUMN_MAP: Record<CandidateDocumentType, { path: string; uploadedAt: string }> = {
	resume: { path: "resume_path", uploadedAt: "resume_uploaded_at" },
	application_form: { path: "application_form_path", uploadedAt: "application_form_uploaded_at" },
	passport_photo: { path: "passport_photo_path", uploadedAt: "passport_photo_uploaded_at" },
};

export function validateDocumentUpload(type: CandidateDocumentType, file: File) {
	if (!ALLOWED_MIME_TYPES[type].includes(file.type)) {
		throw new ValidationError(
			`Unsupported file type for ${type.replace("_", " ")}. Allowed: ${ALLOWED_MIME_TYPES[type].join(", ")}`,
		);
	}
	if (file.size > MAX_SIZE_BYTES[type]) {
		throw new ValidationError(
			`File is too large for ${type.replace("_", " ")}. Max ${Math.round(MAX_SIZE_BYTES[type] / (1024 * 1024))}MB.`,
		);
	}
}

function buildStoragePath(candidateId: string, type: CandidateDocumentType, mimeType: string) {
	const extension = EXTENSION_BY_MIME[mimeType] || "bin";
	return `${candidateId}/${type}-${Date.now()}.${extension}`;
}

export async function uploadCandidateDocument(candidateId: string, type: CandidateDocumentType, file: File): Promise<string> {
	validateDocumentUpload(type, file);

	const path = buildStoragePath(candidateId, type, file.type);
	const buffer = Buffer.from(await file.arrayBuffer());

	const { error } = await getSupabaseServerClient()
		.storage.from(CANDIDATE_DOCUMENTS_BUCKET)
		.upload(path, buffer, { contentType: file.type, upsert: false });

	if (error) {
		throw new Error(`Failed to upload ${type.replace("_", " ")}: ${error.message}`);
	}

	return path;
}

export async function deleteCandidateDocumentFile(path: string): Promise<void> {
	const { error } = await getSupabaseServerClient().storage.from(CANDIDATE_DOCUMENTS_BUCKET).remove([path]);
	if (error) {
		throw new Error(`Failed to delete document file: ${error.message}`);
	}
}

/** Short-lived signed URL — documents are never served via a public URL. */
export async function getSignedDocumentUrl(path: string, expiresInSeconds = 300): Promise<string> {
	const { data, error } = await getSupabaseServerClient()
		.storage.from(CANDIDATE_DOCUMENTS_BUCKET)
		.createSignedUrl(path, expiresInSeconds);

	if (error || !data?.signedUrl) {
		throw new Error(`Failed to create signed URL: ${error?.message || "unknown error"}`);
	}

	return data.signedUrl;
}
