import { getDatabaseAdapter } from "@/database/client";
import { NotFoundError } from "@/lib/errors";
import {
	DOCUMENT_COLUMN_MAP,
	deleteCandidateDocumentFile,
	getSignedDocumentUrl,
	uploadCandidateDocument,
	type CandidateDocumentType,
} from "@/lib/candidate-documents";

export type CandidateDocumentStatus = {
	type: CandidateDocumentType;
	uploaded: boolean;
	uploadedAt: string | null;
};

export type DocumentStatusMap = Record<CandidateDocumentType, { uploaded: boolean; uploadedAt: string | null }>;

const ALL_TYPES: CandidateDocumentType[] = ["resume", "application_form", "passport_photo"];

export async function getCandidateDocumentStatus(candidateId: string): Promise<CandidateDocumentStatus[]> {
	const row = await getDatabaseAdapter().candidates.getDocuments(candidateId);
	if (!row) throw new NotFoundError("Candidate not found.");

	return ALL_TYPES.map((type) => {
		const { path, uploadedAt } = DOCUMENT_COLUMN_MAP[type];
		return {
			type,
			uploaded: !!row[path],
			uploadedAt: row[uploadedAt] ?? null,
		};
	});
}

/** Same as `getCandidateDocumentStatus`, keyed by document type for direct UI consumption. */
export async function getCandidateDocumentStatusMap(candidateId: string): Promise<DocumentStatusMap> {
	const list = await getCandidateDocumentStatus(candidateId);
	return Object.fromEntries(list.map((d) => [d.type, { uploaded: d.uploaded, uploadedAt: d.uploadedAt }])) as DocumentStatusMap;
}

export async function uploadCandidateDocumentFile(
	candidateId: string,
	type: CandidateDocumentType,
	file: File,
): Promise<CandidateDocumentStatus> {
	const row = await getDatabaseAdapter().candidates.getDocuments(candidateId);
	if (!row) throw new NotFoundError("Candidate not found.");

	const { path: pathColumn, uploadedAt: uploadedAtColumn } = DOCUMENT_COLUMN_MAP[type];
	const previousPath: string | null = row[pathColumn];

	const newPath = await uploadCandidateDocument(candidateId, type, file);
	const uploadedAt = new Date().toISOString();

	await getDatabaseAdapter().candidates.update(candidateId, {
		[pathColumn]: newPath,
		[uploadedAtColumn]: uploadedAt,
	});

	// Best-effort cleanup of the file being replaced; the DB update above is
	// the source of truth, so a failure here never leaves the candidate
	// record pointing at a missing file.
	if (previousPath) {
		await deleteCandidateDocumentFile(previousPath).catch(() => undefined);
	}

	return { type, uploaded: true, uploadedAt };
}

export async function deleteCandidateDocument(candidateId: string, type: CandidateDocumentType): Promise<void> {
	const row = await getDatabaseAdapter().candidates.getDocuments(candidateId);
	if (!row) throw new NotFoundError("Candidate not found.");

	const { path: pathColumn, uploadedAt: uploadedAtColumn } = DOCUMENT_COLUMN_MAP[type];
	const existingPath: string | null = row[pathColumn];
	if (!existingPath) throw new NotFoundError(`No ${type.replace("_", " ")} on file for this candidate.`);

	await getDatabaseAdapter().candidates.update(candidateId, {
		[pathColumn]: null,
		[uploadedAtColumn]: null,
	});

	await deleteCandidateDocumentFile(existingPath);
}

export async function getCandidateDocumentUrl(candidateId: string, type: CandidateDocumentType): Promise<string> {
	const row = await getDatabaseAdapter().candidates.getDocuments(candidateId);
	if (!row) throw new NotFoundError("Candidate not found.");

	const { path: pathColumn } = DOCUMENT_COLUMN_MAP[type];
	const path: string | null = row[pathColumn];
	if (!path) throw new NotFoundError(`No ${type.replace("_", " ")} on file for this candidate.`);

	return getSignedDocumentUrl(path);
}
