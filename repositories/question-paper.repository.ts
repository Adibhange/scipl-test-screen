import { getDatabaseAdapter } from "@/database/client";
import type { QuestionPaper, QuestionPaperItem, QuestionPaperStatus } from "@/types";
import { ConflictError, NotFoundError, AuthorizationError } from "@/lib/errors";

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapItem(row: any): QuestionPaperItem {
	return {
		id: row.id,
		questionKey: row.question_key,
		questionType: row.question_type,
		questionText: row.question_text,
		marks: Number(row.marks),
		section: row.section ?? undefined,
		codeLanguage: row.code_language ?? undefined,
		expectedAnswer: row.expected_answer ?? undefined,
		options: row.options ?? undefined,
		sortOrder: row.sort_order,
	};
}

function mapPaper(row: any, includeItems = false): QuestionPaper {
	return {
		id: row.id,
		title: row.title,
		roleId: row.role_id,
		experienceId: row.experience_id,
		status: row.status as QuestionPaperStatus,
		uploadedBy: row.uploaded_by,
		uploadedByName: row.uploaded_by_name,
		rejectionReason: row.rejection_reason ?? undefined,
		approvedBy: row.approved_by ?? undefined,
		approvedByName: row.approved_by_name ?? undefined,
		approvedAt: row.approved_at ?? undefined,
		publishedAt: row.published_at ?? undefined,
		archivedAt: row.archived_at ?? undefined,
		archivedBy: row.archived_by ?? undefined,
		archivedByName: row.archived_by_name ?? undefined,
		totalQuestions: row.total_questions,
		totalMarks: Number(row.total_marks),
		questionCountByType: row.question_count_by_type ?? {},
		version: row.version ?? 1,
		items: includeItems && Array.isArray(row.items) ? row.items.map(mapItem) : undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function listAllPapers(): Promise<QuestionPaper[]> {
	const rows = await getDatabaseAdapter().questionPapers.listAll();
	return rows.map((r) => mapPaper(r));
}

export async function listPapersByUploader(uploadedBy: string): Promise<QuestionPaper[]> {
	const rows = await getDatabaseAdapter().questionPapers.listByUploader(uploadedBy);
	return rows.map((r) => mapPaper(r));
}

export async function getPaperById(id: string): Promise<QuestionPaper | null> {
	const row = await getDatabaseAdapter().questionPapers.getById(id);
	if (!row) return null;
	return mapPaper(row);
}

export async function getPaperWithItems(id: string): Promise<QuestionPaper | null> {
	const row = await getDatabaseAdapter().questionPapers.getWithItems(id);
	if (!row) return null;
	return mapPaper(row, true);
}

export async function getPublishedPaper(roleId: string, experienceId: string): Promise<QuestionPaper | null> {
	const row = await getDatabaseAdapter().questionPapers.getPublished(roleId, experienceId);
	if (!row) return null;
	return mapPaper(row, true);
}

// ─── Write operations ─────────────────────────────────────────────────────────

export async function createPaper(
	paperData: {
		title: string;
		roleId: string;
		experienceId: string;
		uploadedBy: string;
		uploadedByName: string;
		totalQuestions: number;
		totalMarks: number;
		questionCountByType: Record<string, number>;
		version?: number;
		status?: QuestionPaperStatus;
	},
	items: Array<{
		questionKey: string;
		questionType: string;
		questionText: string;
		marks: number;
		section?: string;
		codeLanguage?: string;
		expectedAnswer?: string;
		options?: any[];
	}>,
): Promise<QuestionPaper> {
	const row = await getDatabaseAdapter().questionPapers.create({
		title: paperData.title,
		role_id: paperData.roleId,
		experience_id: paperData.experienceId,
		uploaded_by: paperData.uploadedBy,
		uploaded_by_name: paperData.uploadedByName,
		total_questions: paperData.totalQuestions,
		total_marks: paperData.totalMarks,
		question_count_by_type: paperData.questionCountByType,
		version: paperData.version ?? 1,
		status: paperData.status ?? "draft",
	});

	const itemRows = items.map((item, idx) => ({
		paper_id: row.id,
		question_key: item.questionKey,
		question_type: item.questionType,
		question_text: item.questionText,
		marks: item.marks,
		section: item.section ?? null,
		code_language: item.codeLanguage ?? null,
		expected_answer: item.expectedAnswer ?? null,
		options: item.options ?? null,
		sort_order: idx,
	}));

	await getDatabaseAdapter().questionPapers.createItems(itemRows);

	return mapPaper(row);
}

export async function updatePaperStatus(
	id: string,
	updates: {
		status: QuestionPaperStatus;
		rejectionReason?: string;
		approvedBy?: string;
		approvedByName?: string;
		approvedAt?: string;
		publishedAt?: string;
		archivedAt?: string;
		archivedBy?: string;
		archivedByName?: string;
	},
): Promise<QuestionPaper> {
	const row = await getDatabaseAdapter().questionPapers.updateStatus(id, {
		status: updates.status,
		rejection_reason: updates.rejectionReason ?? null,
		approved_by: updates.approvedBy ?? null,
		approved_by_name: updates.approvedByName ?? null,
		approved_at: updates.approvedAt ?? null,
		published_at: updates.publishedAt ?? null,
		archived_at: updates.archivedAt ?? null,
		archived_by: updates.archivedBy ?? null,
		archived_by_name: updates.archivedByName ?? null,
	});
	return mapPaper(row);
}

/**
 * Atomically archives the currently published paper (if any) for the given
 * role+experience and publishes the new paper.
 */
export async function archiveCurrentAndPublish(
	newPaperId: string,
	roleId: string,
	experienceId: string,
	hrActor: { userId: string; name: string },
): Promise<void> {
	// Archive existing published paper if any
	const existing = await getPublishedPaper(roleId, experienceId);
	if (existing && existing.id !== newPaperId) {
		await updatePaperStatus(existing.id, {
			status: "archived",
			archivedAt: new Date().toISOString(),
			archivedBy: hrActor.userId,
			archivedByName: hrActor.name,
		});
	}

	// Publish new paper
	await updatePaperStatus(newPaperId, {
		status: "published",
		publishedAt: new Date().toISOString(),
		approvedBy: hrActor.userId,
		approvedByName: hrActor.name,
		approvedAt: new Date().toISOString(),
	});
}

export async function deletePaper(id: string): Promise<void> {
	try {
		await getDatabaseAdapter().questionPapers.delete(id);
	} catch (err: any) {
		if (String(err.message).includes("RESTRICT_VIOLATION")) {
			throw new ConflictError(
				"This paper is referenced by one or more candidate sessions and cannot be deleted. Archive it instead.",
			);
		}
		throw err;
	}
}

export async function assertPaperOwnerOrHr(
	paper: QuestionPaper,
	actor: { userId: string; role: string },
): Promise<void> {
	if (actor.role === "hr") return;
	if (paper.uploadedBy !== actor.userId) {
		throw new AuthorizationError("You can only manage your own question papers.");
	}
}

export async function assertPaperIsHR(actor: { role: string }): Promise<void> {
	if (actor.role !== "hr") {
		throw new AuthorizationError("Only HR administrators can perform this action.");
	}
}

export async function replacePaperItems(
	paperId: string,
	actor: { userId: string; role: string },
	title: string,
	payload: {
		totalQuestions: number;
		totalMarks: number;
		questionCountByType: Record<string, number>;
		items: any[];
	},
): Promise<void> {
	const formattedItems = payload.items.map((item, idx) => ({
		question_key: item.questionKey,
		question_type: item.questionType,
		question_text: item.questionText,
		marks: item.marks,
		section: item.section ?? null,
		code_language: item.codeLanguage ?? null,
		expected_answer: item.expectedAnswer ?? null,
		options: item.options ?? null,
		sort_order: idx,
	}));

	try {
		await getDatabaseAdapter().questionPapers.replaceItems(
			paperId,
			actor.userId,
			actor.role,
			title,
			payload.totalQuestions,
			payload.totalMarks,
			payload.questionCountByType,
			formattedItems,
		);
	} catch (err: any) {
		if (String(err.message).includes("RESTRICT_VIOLATION")) {
			throw new ConflictError(err.message.replace("RESTRICT_VIOLATION: ", ""));
		}
		throw err;
	}
}

