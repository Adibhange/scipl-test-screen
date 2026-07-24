/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import {
	createPaper,
	getPaperById,
	getPaperWithItems,
	listAllPapers,
	listPapersByUploader,
	updatePaperStatus,
	archiveCurrentAndPublish,
	deletePaper,
	assertPaperOwnerOrHr,
	assertPaperIsHR,
	replacePaperItems,
} from "@/repositories/question-paper.repository";
import { getDatabaseAdapter } from "@/database/client";
import { ValidationError, AuthorizationError, NotFoundError, ConflictError } from "@/lib/errors";
import type { QuestionPaper, ValidatedPaperPayload, QuestionType } from "@/types";

const ALLOWED_QUESTION_TYPES: QuestionType[] = [
	"mcq_single",
	"mcq_multi",
	"output_prediction",
	"coding",
	"sql",
	"subjective",
];
const MCQ_TYPES = new Set<QuestionType>(["mcq_single", "mcq_multi", "output_prediction"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_QUESTION_ROWS = 500;
const REQUIRED_QUESTION_COLS = [
	"question_key",
	"question_type",
	"question_text",
	"marks",
	"section",
	"code_language",
	"expected_answer",
];
const REQUIRED_OPTION_COLS = ["question_key", "option_key", "option_text", "is_correct"];

// ─── Template generation ──────────────────────────────────────────────────────

export async function generateExcelTemplate(): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();

	// Sheet 1: Instructions
	const instrSheet = wb.addWorksheet("Instructions");
	instrSheet.columns = [{ width: 90 }];
	const instrRows = [
		["QUESTION PAPER UPLOAD TEMPLATE — INSTRUCTIONS"],
		[""],
		["1. Do NOT rename any sheet or column header."],
		["2. Do NOT delete required columns."],
		["3. Each question_key must be unique within this file (e.g. PY-001, PY-002)."],
		["4. For MCQ questions (mcq_single, mcq_multi), add option rows in the 'Options' sheet."],
		["5. Correct answers are stored securely and are NEVER sent to candidates."],
		["6. Role and Experience are selected in the upload screen — do not add free text here."],
		["7. Formula cells are rejected. Enter plain text and numbers only."],
		["8. Allowed question_type values:"],
		["   mcq_single, mcq_multi, output_prediction, coding, sql, subjective"],
		["9. For 'coding' questions, code_language is required."],
		["10. Example rows in the Options sheet are marked EXAMPLE — remove or replace them."],
	];
	instrRows.forEach((r) => instrSheet.addRow(r));
	instrSheet.getRow(1).font = { bold: true, size: 13 };

	// Sheet 2: Questions
	const qSheet = wb.addWorksheet("Questions");
	qSheet.columns = [
		{ header: "question_key", key: "question_key", width: 14 },
		{ header: "question_type", key: "question_type", width: 20 },
		{ header: "question_text", key: "question_text", width: 55 },
		{ header: "marks", key: "marks", width: 8 },
		{ header: "section", key: "section", width: 18 },
		{ header: "code_language", key: "code_language", width: 16 },
		{ header: "expected_answer", key: "expected_answer", width: 40 },
	];
	qSheet.getRow(1).font = { bold: true };
	qSheet.getRow(1).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE0E7FF" },
	};

	// Add dropdown validation for question_type column (B2:B501)
	for (let row = 2; row <= 501; row++) {
		qSheet.getCell(`B${row}`).dataValidation = {
			type: "list",
			allowBlank: true,
			formulae: ['"mcq_single,mcq_multi,output_prediction,coding,sql,subjective"'],
			showErrorMessage: true,
			errorTitle: "Invalid type",
			error: "Please select a value from the dropdown.",
		};
	}

	// Example rows
	qSheet.addRow(["PY-001", "mcq_single", "What does the 'yield' keyword do in Python?", 5, "Python Basics", "", ""]);
	qSheet.addRow(["PY-002", "coding", "Write a function to reverse a linked list.", 10, "Data Structures", "Python", "See expected_answer column"]);

	// Sheet 3: Options
	const optSheet = wb.addWorksheet("Options");
	optSheet.columns = [
		{ header: "question_key", key: "question_key", width: 14 },
		{ header: "option_key", key: "option_key", width: 12 },
		{ header: "option_text", key: "option_text", width: 55 },
		{ header: "is_correct", key: "is_correct", width: 12 },
	];
	optSheet.getRow(1).font = { bold: true };
	optSheet.getRow(1).fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE0E7FF" },
	};

	// Add TRUE/FALSE dropdown for is_correct column (D2:D1001)
	for (let row = 2; row <= 1001; row++) {
		optSheet.getCell(`D${row}`).dataValidation = {
			type: "list",
			allowBlank: true,
			formulae: ['"TRUE,FALSE"'],
			showErrorMessage: true,
			errorTitle: "Invalid value",
			error: "Please enter TRUE or FALSE.",
		};
	}

	// Example rows (marked EXAMPLE — will be ignored if question_key not in Questions sheet)
	const exRow1 = optSheet.addRow(["PY-001", "A", "It pauses a generator function and returns a value.", "TRUE"]);
	const exRow2 = optSheet.addRow(["PY-001", "B", "It raises a StopIteration exception immediately.", "FALSE"]);
	const exRow3 = optSheet.addRow(["PY-001", "C", "It returns from a function permanently.", "FALSE"]);
	const exRow4 = optSheet.addRow(["PY-001", "D", "It imports a module lazily.", "FALSE"]);
	[exRow1, exRow2, exRow3, exRow4].forEach((r) => {
		r.font = { italic: true, color: { argb: "FF888888" } };
	});

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}

// ─── Excel parsing & validation ───────────────────────────────────────────────

/**
 * Parses an uploaded .xlsx buffer and validates all rules.
 * Formula cells produce hard errors — never silently modified.
 * Returns { errors, data } where data is null when errors.length > 0.
 */
export async function parseAndValidateExcel(
	buffer: Buffer,
	fileSizeBytes: number,
): Promise<{ errors: string[]; data: ValidatedPaperPayload | null }> {
	const errors: string[] = [];

	if (fileSizeBytes > MAX_FILE_BYTES) {
		return { errors: [`File size exceeds the 5 MB limit (got ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB).`], data: null };
	}

	const wb = new ExcelJS.Workbook();
	try {
		await wb.xlsx.load(buffer as any);
	} catch {
		return { errors: ["Could not read the file. Ensure it is a valid .xlsx workbook."], data: null };
	}

	const qSheet = wb.getWorksheet("Questions");
	const optSheet = wb.getWorksheet("Options");
	const instrSheet = wb.getWorksheet("Instructions");

	if (!instrSheet) errors.push('Workbook is missing required sheet: "Instructions".');
	if (!qSheet) errors.push('Workbook is missing required sheet: "Questions".');
	if (!optSheet) errors.push('Workbook is missing required sheet: "Options".');
	if (errors.length) return { errors, data: null };

	// --- Validate Questions sheet columns ---
	const qHeader = (qSheet!.getRow(1).values as any[]).slice(1).map((v: any) => String(v ?? "").toLowerCase().trim());
	for (const col of REQUIRED_QUESTION_COLS) {
		if (!qHeader.includes(col)) {
			errors.push(`Questions sheet is missing required column: "${col}".`);
		}
	}

	// --- Validate Options sheet columns ---
	const optHeader = (optSheet!.getRow(1).values as any[]).slice(1).map((v: any) => String(v ?? "").toLowerCase().trim());
	for (const col of REQUIRED_OPTION_COLS) {
		if (!optHeader.includes(col)) {
			errors.push(`Options sheet is missing required column: "${col}".`);
		}
	}

	if (errors.length) return { errors, data: null };

	// Map column names to indexes
	const qColIdx: Record<string, number> = {};
	qHeader.forEach((h: string, i: number) => { qColIdx[h] = i + 1; }); // 1-indexed for ExcelJS

	const optColIdx: Record<string, number> = {};
	optHeader.forEach((h: string, i: number) => { optColIdx[h] = i + 1; });

	// Helper to safely read a cell value, error on formula
	function readCell(sheet: ExcelJS.Worksheet, rowNum: number, colIdx: number, sheetLabel: string, colName: string): { value: string | null; formulaError: string | null } {
		const cell = sheet.getCell(rowNum, colIdx);
		if (cell.formula || (cell as any).sharedFormula) {
			return {
				value: null,
				formulaError: `${sheetLabel} row ${rowNum}, column "${colName}": formula cells are not permitted.`,
			};
		}
		const raw = cell.value;
		if (raw === null || raw === undefined || String(raw).trim() === "") return { value: null, formulaError: null };
		return { value: String(raw).trim(), formulaError: null };
	}

	// --- Parse Questions rows ---
	const questionRows: {
		rowNum: number;
		key: string;
		type: QuestionType;
		text: string;
		marks: number;
		section?: string;
		codeLanguage?: string;
		expectedAnswer?: string;
	}[] = [];
	const seenKeys = new Set<string>();

	let qRowCount = 0;
	qSheet!.eachRow((row, rowNum) => {
		if (rowNum === 1) return; // header
		qRowCount++;

		// Check row limit
		if (qRowCount > MAX_QUESTION_ROWS) {
			errors.push(`Questions sheet exceeds the ${MAX_QUESTION_ROWS} row limit.`);
			return;
		}

		// Read each required cell
		const keyCell = readCell(qSheet!, rowNum, qColIdx["question_key"], "Questions", "question_key");
		const typeCell = readCell(qSheet!, rowNum, qColIdx["question_type"], "Questions", "question_type");
		const textCell = readCell(qSheet!, rowNum, qColIdx["question_text"], "Questions", "question_text");
		const marksCell = readCell(qSheet!, rowNum, qColIdx["marks"], "Questions", "marks");

		// Collect formula errors
		[keyCell, typeCell, textCell, marksCell].forEach((c) => { if (c.formulaError) errors.push(c.formulaError); });

		if (!keyCell.value) {
			errors.push(`Questions row ${rowNum}: question_key is required.`);
			return;
		}
		if (seenKeys.has(keyCell.value)) {
			errors.push(`Questions row ${rowNum}: duplicate question_key "${keyCell.value}".`);
			return;
		}
		seenKeys.add(keyCell.value);

		if (!typeCell.value || !ALLOWED_QUESTION_TYPES.includes(typeCell.value as QuestionType)) {
			errors.push(`Questions row ${rowNum}: invalid question_type "${typeCell.value ?? ""}". Allowed: ${ALLOWED_QUESTION_TYPES.join(", ")}.`);
			return;
		}

		if (!textCell.value) {
			errors.push(`Questions row ${rowNum}: question_text is required.`);
		}

		const marksNum = Number(marksCell.value);
		if (!marksCell.value || isNaN(marksNum) || marksNum <= 0) {
			errors.push(`Questions row ${rowNum}: marks must be a positive number.`);
			return;
		}

		const qType = typeCell.value as QuestionType;

		// Read optional cells
		const sectionCell = readCell(qSheet!, rowNum, qColIdx["section"], "Questions", "section");
		const codeCell = readCell(qSheet!, rowNum, qColIdx["code_language"], "Questions", "code_language");
		const answerCell = readCell(qSheet!, rowNum, qColIdx["expected_answer"], "Questions", "expected_answer");
		[sectionCell, codeCell, answerCell].forEach((c) => { if (c.formulaError) errors.push(c.formulaError); });

		if (qType === "coding" && !codeCell.value) {
			errors.push(`Questions row ${rowNum}: code_language is required for coding questions.`);
		}

		questionRows.push({
			rowNum,
			key: keyCell.value,
			type: qType,
			text: textCell.value ?? "",
			marks: marksNum,
			section: sectionCell.value ?? undefined,
			codeLanguage: codeCell.value ?? undefined,
			expectedAnswer: answerCell.value ?? undefined,
		});
	});

	// --- Parse Options rows ---
	type OptionRow = { key: string; text: string; isCorrect: boolean };
	const optionsByQuestion: Record<string, OptionRow[]> = {};

	optSheet!.eachRow((row, rowNum) => {
		if (rowNum === 1) return;

		const qKeyCell = readCell(optSheet!, rowNum, optColIdx["question_key"], "Options", "question_key");
		const oKeyCell = readCell(optSheet!, rowNum, optColIdx["option_key"], "Options", "option_key");
		const oTextCell = readCell(optSheet!, rowNum, optColIdx["option_text"], "Options", "option_text");
		const isCorrectCell = readCell(optSheet!, rowNum, optColIdx["is_correct"], "Options", "is_correct");

		[qKeyCell, oKeyCell, oTextCell, isCorrectCell].forEach((c) => { if (c.formulaError) errors.push(c.formulaError); });

		if (!qKeyCell.value) return; // blank row, skip

		if (!seenKeys.has(qKeyCell.value)) {
			errors.push(`Options row ${rowNum}: question_key "${qKeyCell.value}" does not exist in the Questions sheet.`);
			return;
		}

		if (!oTextCell.value) {
			errors.push(`Options row ${rowNum}: option_text is required.`);
		}

		const isCorrectStr = (isCorrectCell.value ?? "").toUpperCase();
		if (isCorrectStr !== "TRUE" && isCorrectStr !== "FALSE") {
			errors.push(`Options row ${rowNum}: is_correct must be TRUE or FALSE.`);
			return;
		}

		if (!optionsByQuestion[qKeyCell.value]) optionsByQuestion[qKeyCell.value] = [];

		// Check for duplicate option_key within question
		const dupKey = optionsByQuestion[qKeyCell.value].find((o) => o.key === oKeyCell.value);
		if (dupKey) {
			errors.push(`Options row ${rowNum}: duplicate option_key "${oKeyCell.value}" for question "${qKeyCell.value}".`);
			return;
		}

		optionsByQuestion[qKeyCell.value].push({
			key: oKeyCell.value ?? "",
			text: oTextCell.value ?? "",
			isCorrect: isCorrectStr === "TRUE",
		});
	});

	// --- Cross-validate MCQ correctness rules ---
	for (const qRow of questionRows) {
		const opts = optionsByQuestion[qRow.key] ?? [];
		const isMCQ = MCQ_TYPES.has(qRow.type);

		if (!isMCQ && opts.length > 0) {
			errors.push(`Questions row ${qRow.rowNum}: question_type "${qRow.type}" must not have options in the Options sheet.`);
		}

		if (isMCQ) {
			const correctCount = opts.filter((o) => o.isCorrect).length;
			if (qRow.type === "mcq_single" && correctCount !== 1) {
				errors.push(`Questions row ${qRow.rowNum}: mcq_single requires exactly one correct option (found ${correctCount}).`);
			}
			if (qRow.type === "mcq_multi" && correctCount < 1) {
				errors.push(`Questions row ${qRow.rowNum}: mcq_multi requires at least one correct option (found ${correctCount}).`);
			}
		}
	}

	if (questionRows.length === 0) {
		errors.push("The Questions sheet contains no valid question rows.");
	}

	const totalMarks = questionRows.reduce((sum, q) => sum + q.marks, 0);
	if (totalMarks <= 0) {
		errors.push("Paper has no questions with positive marks. Total possible marks must be greater than zero.");
	}

	if (errors.length) return { errors, data: null };

	// --- Build validated payload ---
	const countByType: Record<string, number> = {};
	const sectionTotals: Record<string, { questions: number; marks: number }> = {
		"Multiple Choice": { questions: 0, marks: 0 },
		"Coding": { questions: 0, marks: 0 },
		"SQL": { questions: 0, marks: 0 },
		"Subjective": { questions: 0, marks: 0 },
	};

	const items = questionRows.map((q, idx) => {
		countByType[q.type] = (countByType[q.type] ?? 0) + 1;
		
		let derivedSection = "Subjective";
		if (["mcq_single", "mcq_multi", "output_prediction"].includes(q.type)) {
			derivedSection = "Multiple Choice";
		} else if (q.type === "coding") {
			derivedSection = "Coding";
		} else if (q.type === "sql") {
			derivedSection = "SQL";
		} else if (q.type === "subjective") {
			derivedSection = "Subjective";
		}

		if (sectionTotals[derivedSection]) {
			sectionTotals[derivedSection].questions += 1;
			sectionTotals[derivedSection].marks += q.marks;
		}

		const opts = optionsByQuestion[q.key];
		return {
			questionKey: q.key,
			questionType: q.type,
			questionText: q.text,
			marks: q.marks,
			section: q.section, // keep Excel topic label as the internal topic label
			derivedSection,
			codeLanguage: q.codeLanguage,
			expectedAnswer: q.expectedAnswer,
			options: opts
				? opts.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect }))
				: undefined,
		};
	});

	return {
		errors: [],
		data: {
			items,
			totalQuestions: items.length,
			totalMarks,
			questionCountByType: countByType,
			sectionTotals,
		},
	};
}

// ─── Paper lifecycle operations ───────────────────────────────────────────────

export async function saveDraft(
	actor: { userId: string; name: string; role: string },
	roleId: string,
	experienceId: string,
	title: string,
	payload: ValidatedPaperPayload,
): Promise<QuestionPaper> {
	if (actor.role === "director") {
		throw new AuthorizationError("Directors cannot upload question papers.");
	}

	// Verify role and experience are valid active metadata values
	const meta = getDatabaseAdapter().metadata;
	const [roles, exps] = await Promise.all([
		meta.getMasterRoles(true),
		meta.getMasterExperiences(true),
	]);
	if (!roles.find((r: any) => r.id === roleId)) {
		throw new ValidationError("Selected role is not a valid active metadata value.");
	}
	if (!exps.find((e: any) => e.id === experienceId)) {
		throw new ValidationError("Selected experience is not a valid active metadata value.");
	}

	return createPaper(
		{
			title,
			roleId,
			experienceId,
			uploadedBy: actor.userId,
			uploadedByName: actor.name,
			totalQuestions: payload.totalQuestions,
			totalMarks: payload.totalMarks,
			questionCountByType: payload.questionCountByType,
			status: "draft",
		},
		payload.items,
	);
}

export async function submitForApproval(
	actor: { userId: string; role: string },
	paperId: string,
): Promise<QuestionPaper> {
	if (actor.role === "director") throw new AuthorizationError("Directors cannot submit question papers.");

	const paper = await getPaperById(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	await assertPaperOwnerOrHr(paper, actor);

	if (paper.status !== "draft" && paper.status !== "rejected") {
		throw new ConflictError(`Cannot submit a paper with status "${paper.status}". Only draft or rejected papers can be submitted.`);
	}

	return updatePaperStatus(paperId, { status: "submitted_for_approval" });
}

export async function approvePaper(
	actor: { userId: string; name: string; role: string },
	paperId: string,
): Promise<QuestionPaper> {
	await assertPaperIsHR(actor);

	const paper = await getPaperById(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	if (paper.status !== "submitted_for_approval") {
		throw new ConflictError(`Cannot approve a paper with status "${paper.status}". Only submitted papers can be approved.`);
	}

	await archiveCurrentAndPublish(paperId, paper.roleId, paper.experienceId, actor);

	const updated = await getPaperById(paperId);
	return updated!;
}

export async function rejectPaper(
	actor: { userId: string; role: string },
	paperId: string,
	reason: string,
): Promise<QuestionPaper> {
	await assertPaperIsHR(actor);

	if (!reason || reason.trim().length === 0) {
		throw new ValidationError("A rejection reason is required.");
	}

	const paper = await getPaperById(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	if (paper.status !== "submitted_for_approval") {
		throw new ConflictError(`Cannot reject a paper with status "${paper.status}".`);
	}

	return updatePaperStatus(paperId, { status: "rejected", rejectionReason: reason.trim() });
}

export async function archivePaper(
	actor: { userId: string; name: string; role: string },
	paperId: string,
): Promise<QuestionPaper> {
	await assertPaperIsHR(actor);

	const paper = await getPaperById(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	if (paper.status !== "published") {
		throw new ConflictError(`Cannot archive a paper with status "${paper.status}". Only published papers can be archived.`);
	}

	return updatePaperStatus(paperId, {
		status: "archived",
		archivedAt: new Date().toISOString(),
		archivedBy: actor.userId,
		archivedByName: actor.name,
	});
}

export async function removePaper(
	actor: { userId: string; role: string },
	paperId: string,
): Promise<void> {
	if (actor.role === "director") throw new AuthorizationError("Directors cannot delete question papers.");

	const paper = await getPaperById(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	await assertPaperOwnerOrHr(paper, actor);

	if (paper.status !== "draft" && paper.status !== "rejected") {
		throw new ConflictError(`Cannot delete a paper with status "${paper.status}". Only draft or rejected papers can be deleted.`);
	}

	await deletePaper(paperId);
}

export async function listPapersForActor(
	actor: { userId: string; role: string },
): Promise<QuestionPaper[]> {
	if (actor.role === "director") throw new AuthorizationError("Directors cannot access question papers.");
	if (actor.role === "hr") return listAllPapers();
	return listPapersByUploader(actor.userId);
}

export async function getPaperDetailForActor(
	actor: { userId: string; role: string },
	paperId: string,
): Promise<QuestionPaper> {
	if (actor.role === "director") throw new AuthorizationError("Directors cannot access question papers.");

	const paper = await getPaperWithItems(paperId);
	if (!paper) throw new NotFoundError("Question paper not found.");

	if (actor.role !== "hr" && paper.uploadedBy !== actor.userId) {
		throw new AuthorizationError("You can only view your own question papers.");
	}

	return paper;
}
