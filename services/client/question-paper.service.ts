/**
 * Client-side service for Question Papers API.
 * This is a dedicated service — interview.service.ts is untouched.
 */

export type PaperAction = "submit" | "approve" | "reject" | "archive";

async function handleResponse<T>(res: Response): Promise<T> {
	const json = await res.json();
	if (!json.success) {
		throw new Error(json.error?.message ?? "An unexpected error occurred.");
	}
	return json.data as T;
}

/** Download the Excel template as a browser file download. */
export async function downloadQuestionPaperTemplate(): Promise<void> {
	const res = await fetch("/api/admin/question-papers/template");
	if (!res.ok) throw new Error("Could not download template.");
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "question-paper-template.xlsx";
	a.click();
	URL.revokeObjectURL(url);
}

/** Validate an Excel file without saving. Returns errors and a summary. */
export async function validateQuestionPaper(file: File): Promise<{
	valid: boolean;
	errors: string[];
	summary: {
		totalQuestions: number;
		totalMarks: number;
		questionCountByType: Record<string, number>;
	} | null;
}> {
	const fd = new FormData();
	fd.append("file", file);
	const res = await fetch("/api/admin/question-papers/validate", { method: "POST", body: fd });
	return handleResponse(res);
}

/** Upload a validated Excel file and save it as a draft question paper. */
export async function uploadQuestionPaper(
	file: File,
	roleId: string,
	experienceId: string,
	title: string,
): Promise<{ paper: any | null; errors: string[] }> {
	const fd = new FormData();
	fd.append("file", file);
	fd.append("roleId", roleId);
	fd.append("experienceId", experienceId);
	fd.append("title", title);
	const res = await fetch("/api/admin/question-papers", { method: "POST", body: fd });
	return handleResponse(res);
}

/** List papers visible to the authenticated actor. */
export async function listQuestionPapers(): Promise<any[]> {
	const res = await fetch("/api/admin/question-papers");
	return handleResponse(res);
}

/** Get a single paper with all items (including correct answers for HR/Interviewer). */
export async function getQuestionPaper(id: string): Promise<any> {
	const res = await fetch(`/api/admin/question-papers/${id}`);
	return handleResponse(res);
}

/** Submit, approve, reject, or archive a question paper. */
export async function paperAction(
	id: string,
	action: PaperAction,
	reason?: string,
): Promise<any> {
	const res = await fetch(`/api/admin/question-papers/${id}/action`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action, reason }),
	});
	return handleResponse(res);
}

/** Delete a draft or rejected paper. */
export async function deleteQuestionPaper(id: string): Promise<void> {
	const res = await fetch(`/api/admin/question-papers/${id}`, { method: "DELETE" });
	await handleResponse(res);
}
