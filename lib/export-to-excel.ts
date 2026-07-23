import ExcelJS from "exceljs";
import type { CandidateResult } from "@/types";
import { computeCandidateStatus, getCurrentRoundKey } from "@/lib/filters";

interface MetadataOption {
	value: string;
	label: string;
}

interface VacancyOption {
	id: string;
	role: string;
	experience: string;
	hiring_location: string;
}

interface ExportExcelParams {
	results: CandidateResult[];
	activeRoles: MetadataOption[];
	activeExperiences: MetadataOption[];
	activeTestLocations: MetadataOption[];
	activeHiringLocations: MetadataOption[];
	activeVacancies: VacancyOption[];
}

export async function exportToExcel({
	results,
	activeRoles,
	activeExperiences,
	activeTestLocations,
	activeHiringLocations,
	activeVacancies,
}: ExportExcelParams): Promise<void> {
	// Resolve each vacancy's role/experience/hiring-location codes to their
	// human-readable labels once, so the "Vacancy" column shows a real title
	// (e.g. "SQL Developer (3-5 Years) - Pune Office") instead of the raw
	// internal UUID.
	const roleLabelByValue = new Map(activeRoles.map((r) => [r.value, r.label]));
	const experienceLabelByValue = new Map(activeExperiences.map((e) => [e.value, e.label]));
	const hiringLocationLabelByValue = new Map(activeHiringLocations.map((h) => [h.value, h.label]));

	const vacancyTitleById = new Map<string, string>(
		activeVacancies.map((v) => {
			const roleLabel = roleLabelByValue.get(v.role) || v.role || "Unknown role";
			const experienceLabel = experienceLabelByValue.get(v.experience) || v.experience || "";
			const hiringLocationLabel = hiringLocationLabelByValue.get(v.hiring_location) || v.hiring_location || "";
			const title = experienceLabel && hiringLocationLabel
				? `${roleLabel} (${experienceLabel}) - ${hiringLocationLabel}`
				: roleLabel;
			return [v.id, title];
		}),
	);

	// Create Workbook
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Candidate Assessment Portal";
	workbook.lastModifiedBy = "HR Admin";
	workbook.created = new Date();

	// Style Constants
	const headerFill: ExcelJS.Fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FF4F46E5" }, // Indigo-600 (FF prefix for alpha)
	};

	const headerFont: Partial<ExcelJS.Font> = {
		name: "Segoe UI",
		size: 10,
		bold: true,
		color: { argb: "FFFFFFFF" },
	};

	const borderStyle: Partial<ExcelJS.Borders> = {
		top: { style: "thin", color: { argb: "FFE2E8F0" } },
		left: { style: "thin", color: { argb: "FFE2E8F0" } },
		bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
		right: { style: "thin", color: { argb: "FFE2E8F0" } },
	};

	const textFont: Partial<ExcelJS.Font> = {
		name: "Segoe UI",
		size: 10,
	};

	// Helper for Display Labels
	const getDisplayLabel = (value: string | undefined, list: MetadataOption[], fallback: string) => {
		if (!value) return fallback;
		const match = list.find((item) => item.value === value);
		return match ? match.label : value;
	};

	const getRoundLabel = (res: CandidateResult) => {
		const key = getCurrentRoundKey(res);
		return key === "face_to_face" ? "Round 1"
			: key === "assessment" ? "Round 2"
			: "Round 3";
	};

	// Common cell formatting applicator
	const formatWorksheet = (worksheet: ExcelJS.Worksheet, wrapCols: string[]) => {
		// Frozen header row
		worksheet.views = [{ state: "frozen", ySplit: 1 }];

		// Enable Auto Filter
		const colCount = worksheet.columns.length;
		worksheet.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: colCount },
		};

		// Header Row formatting
		const headerRow = worksheet.getRow(1);
		headerRow.height = 26;
		headerRow.eachCell((cell) => {
			cell.font = headerFont;
			cell.fill = headerFill;
			cell.alignment = { vertical: "middle", horizontal: "left" };
			cell.border = borderStyle;
		});

		// Data Row formatting
		worksheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;
			row.height = 20;

			const isEven = rowNumber % 2 === 0;
			const rowColor = isEven ? "FFF9FAFB" : "FFFFFFFF";

			row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
				cell.font = textFont;
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: rowColor },
				};
				cell.border = borderStyle;

				// Apply Text Wrapping if column is configured
				const colHeader = worksheet.columns[colNumber - 1]?.header;
				if (colHeader && typeof colHeader === "string" && wrapCols.includes(colHeader)) {
					cell.alignment = { wrapText: true, vertical: "top", horizontal: "left" };
				} else {
					cell.alignment = { vertical: "middle", horizontal: "left" };
				}
			});
		});

		// Auto Column Width calculation
		worksheet.columns.forEach((col) => {
			let maxLen = 12; // Minimum column width
			col.eachCell?.({ includeEmpty: true }, (cell) => {
				if (cell.value !== null && cell.value !== undefined) {
					let valStr = "";
					if (typeof cell.value === "object" && "text" in cell.value) {
						valStr = String(cell.value.text);
					} else {
						valStr = String(cell.value);
					}
					if (valStr.length > maxLen) {
						maxLen = valStr.length;
					}
				}
			});
			col.width = Math.min(45, maxLen + 4); // Limit max column width to 45 for wrap readability
		});
	};

	// ----------------------------------------------------
	// SHEET 1: Candidate Pipeline
	// ----------------------------------------------------
	const s1 = workbook.addWorksheet("Candidate Pipeline");
	s1.columns = [
		{ header: "Candidate ID", key: "candidateId" },
		{ header: "Full Name", key: "name" },
		{ header: "Email", key: "email" },
		{ header: "Mobile", key: "mobile" },
		{ header: "Applied Role", key: "role" },
		{ header: "Experience Level", key: "experience" },
		{ header: "Test Location", key: "testLocation" },
		{ header: "Hiring Location", key: "hiringLocation" },
		{ header: "Hiring Status", key: "hiringStatus" },
		{ header: "Current Round", key: "currentRound" },
		{ header: "Submitted Date", key: "submittedAt" },
		{ header: "Vacancy", key: "vacancy" },
		{ header: "Final Score", key: "finalScore" },
		{ header: "Marks Awarded", key: "marksAwarded" },
		{ header: "Total Marks", key: "totalMarks" },
		{ header: "Percentage", key: "percentage" },
		{ header: "Penalty", key: "penalty" },
		{ header: "Duration", key: "duration" },
		{ header: "Tab Switches", key: "tabSwitches" },
		{ header: "Assigned Interviewer", key: "assignedInterviewer" },
		{ header: "Round 1 Status", key: "round1" },
		{ header: "Round 2 Status", key: "round2" },
		{ header: "Round 3 Status", key: "round3" },
		{ header: "Expected Salary", key: "expectedSalary" },
		{ header: "Offered Salary", key: "offerSalary" },
		{ header: "HR Notes", key: "hrNotes" },
	];

	results.forEach((res) => {
		const computedStatus = computeCandidateStatus(res);
		const displayRole = getDisplayLabel(res.candidate.role, activeRoles, res.candidate.role);
		const displayExp = getDisplayLabel(res.candidate.experience, activeExperiences, res.candidate.experience);
		const displayTestLoc = getDisplayLabel(res.candidate.testLocation, activeTestLocations, "Home");
		const displayHiringLoc = getDisplayLabel(res.candidate.hiringLocation, activeHiringLocations, "Not assigned");

		const penalty = res.scoreBreakdown?.tabSwitchDeduction ?? (res.tabSwitches * 10);
		const rawScore = res.scoreBreakdown?.scoreBeforeDeduction ?? res.totalMarksAwarded;

		const expectedSalVal = res.candidate.expectedSalary !== undefined ? Number(res.candidate.expectedSalary) : null;
		const offerSalVal = res.candidate.offerSalary !== undefined ? Number(res.candidate.offerSalary) : null;

		const formatStatus = (s: string) => {
			if (s === "in_interview") return "In Interview";
			if (s === "on_hold") return "On Hold";
			if (s === "screening") return "Screening";
			if (s === "hired") return "Hired";
			if (s === "rejected") return "Rejected";
			return s;
		};

		const row = s1.addRow({
			candidateId: res.candidate.id || "—",
			name: res.candidate.name,
			email: res.candidate.email,
			mobile: res.candidate.mobile,
			role: displayRole,
			experience: displayExp,
			testLocation: displayTestLoc,
			hiringLocation: displayHiringLoc,
			hiringStatus: formatStatus(computedStatus),
			currentRound: getRoundLabel(res),
			submittedAt: res.submittedAt ? res.submittedAt.slice(0, 10) : "—",
			vacancy: (res.candidate.vacancyId && vacancyTitleById.get(res.candidate.vacancyId)) || "—",
			finalScore: res.totalMarksAwarded !== undefined ? res.totalMarksAwarded : "Pending Evaluation",
			marksAwarded: rawScore !== undefined ? rawScore : "Pending Evaluation",
			totalMarks: res.totalMarksPossible !== undefined ? res.totalMarksPossible : "—",
			percentage: (res.totalMarksAwarded !== undefined && res.totalMarksPossible) 
				? (res.totalMarksAwarded / res.totalMarksPossible) 
				: "—",
			penalty,
			duration: Math.round(res.secondsUsed / 60),
			tabSwitches: res.tabSwitches,
			assignedInterviewer: res.assignedInterviewerName || "Unassigned",
			round1: res.interviewRounds?.face_to_face?.status ?? "pending",
			round2: res.interviewRounds?.assessment?.status ?? "pending",
			round3: res.directorDecision ?? "pending",
			expectedSalary: expectedSalVal,
			offerSalary: offerSalVal,
			hrNotes: res.candidate.hrNotes || "",
		});

		// Force formatting on specific cells in Sheet 1
		row.getCell("mobile").numFmt = "@";
		if (res.totalMarksAwarded !== undefined && res.totalMarksPossible) {
			row.getCell("percentage").numFmt = "0.0%";
		}
		if (expectedSalVal !== null) {
			row.getCell("expectedSalary").numFmt = '"₹"#,##,##0';
		} else {
			row.getCell("expectedSalary").value = "—";
		}
		if (offerSalVal !== null) {
			row.getCell("offerSalary").numFmt = '"₹"#,##,##0';
		} else {
			row.getCell("offerSalary").value = "—";
		}
	});

	formatWorksheet(s1, ["HR Notes"]);

	// ----------------------------------------------------
	// SHEET 2: Candidate Experience
	// ----------------------------------------------------
	const s2 = workbook.addWorksheet("Candidate Experience");
	s2.columns = [
		{ header: "Candidate ID", key: "candidateId" },
		{ header: "Candidate Name", key: "name" },
		{ header: "Company Name", key: "companyName" },
		{ header: "Job Title", key: "designation" },
		{ header: "Start Date", key: "joiningDate" },
		{ header: "End Date", key: "leavingDate" },
		{ header: "Current Company", key: "isCurrent" },
		{ header: "Notice Period (Days)", key: "noticePeriod" },
		{ header: "Salary (Current CTC)", key: "salary" },
		{ header: "Employment Type", key: "employmentType" },
		{ header: "Total Experience", key: "totalExperience" },
		{ header: "Responsibilities", key: "responsibilities" },
		{ header: "Technologies", key: "technologies" },
		{ header: "Reason for Leaving", key: "reasonForLeaving" },
	];

	results.forEach((res) => {
		const exps = res.candidate.experiences || [];
		exps.forEach((exp) => {
			const salVal = exp.salary !== null && exp.salary !== undefined ? Number(exp.salary) : null;
			const row = s2.addRow({
				candidateId: res.candidate.id || "—",
				name: res.candidate.name,
				companyName: exp.companyName || "—",
				designation: exp.designation || "—",
				joiningDate: exp.joiningDate ? exp.joiningDate.slice(0, 10) : "—",
				leavingDate: exp.leavingDate ? exp.leavingDate.slice(0, 10) : (exp.isCurrent ? "Present" : "—"),
				isCurrent: exp.isCurrent ? "Yes" : "No",
				noticePeriod: exp.noticePeriod !== undefined ? exp.noticePeriod : "—",
				salary: salVal,
				employmentType: "—",
				totalExperience: "—",
				responsibilities: "—",
				technologies: "—",
				reasonForLeaving: "—",
			});

			if (salVal !== null) {
				row.getCell("salary").numFmt = '"₹"#,##,##0';
			} else {
				row.getCell("salary").value = "—";
			}
		});
	});

	formatWorksheet(s2, ["Responsibilities", "Technologies", "Reason for Leaving"]);

	// ----------------------------------------------------
	// SHEET 3: Candidate References
	// ----------------------------------------------------
	const s3 = workbook.addWorksheet("Candidate References");
	s3.columns = [
		{ header: "Candidate ID", key: "candidateId" },
		{ header: "Candidate Name", key: "name" },
		{ header: "Reference Name", key: "referenceName" },
		{ header: "Phone", key: "referenceMobile" },
		{ header: "Internal Employee", key: "isInternal" },
		{ header: "Employee Code", key: "employeeCode" },
		{ header: "Employee Name", key: "employeeName" },
		{ header: "Verified By", key: "verifiedBy" },
		{ header: "Verified Date", key: "verifiedAt" },
		{ header: "Verification Notes", key: "notes" },
		{ header: "Reference Company", key: "company" },
		{ header: "Reference Designation", key: "designation" },
		{ header: "Reference Relationship", key: "relationship" },
		{ header: "Reference Email", key: "email" },
	];

	results.forEach((res) => {
		const refs = res.candidate.references || [];
		refs.forEach((ref) => {
			const row = s3.addRow({
				candidateId: res.candidate.id || "—",
				name: res.candidate.name,
				referenceName: ref.referenceName || "—",
				referenceMobile: ref.referenceMobile || "—",
				isInternal: ref.referenceType === "INTERNAL" ? "Yes" : "No",
				employeeCode: ref.employeeCode || "—",
				employeeName: "—",
				verifiedBy: ref.verifiedBy || "—",
				verifiedAt: "—",
				notes: ref.notes || "",
				company: "—",
				designation: "—",
				relationship: "—",
				email: "—",
			});

			row.getCell("referenceMobile").numFmt = "@";
			row.getCell("employeeCode").numFmt = "@";
		});
	});

	formatWorksheet(s3, ["Verification Notes"]);

	// ----------------------------------------------------
	// SHEET 4: Assessment Details
	// ----------------------------------------------------
	const s4 = workbook.addWorksheet("Assessment Details");
	s4.columns = [
		{ header: "Candidate ID", key: "candidateId" },
		{ header: "Candidate Name", key: "name" },
		{ header: "MCQ Score", key: "mcq" },
		{ header: "Coding Score", key: "coding" },
		{ header: "SQL Score", key: "sql" },
		{ header: "Subjective Score", key: "subjective" },
		{ header: "Total Marks", key: "totalMarks" },
		{ header: "Awarded Marks", key: "marksAwarded" },
		{ header: "Percentage", key: "percentage" },
		{ header: "Penalty", key: "penalty" },
		{ header: "Final Score", key: "finalScore" },
		{ header: "Duration", key: "duration" },
		{ header: "Submitted Date", key: "submittedAt" },
		{ header: "Score Breakdown", key: "breakdown" },
	];

	results.forEach((res) => {
		const b = res.scoreBreakdown;
		const mcqVal = b ? `${b.mcq.awarded}/${b.mcq.possible}` : "—";
		const codingVal = b ? `${b.coding.awarded}/${b.coding.possible}` : "—";
		const sqlVal = b ? `${b.sql.awarded}/${b.sql.possible}` : "—";
		const subjVal = b ? `${b.subjective.awarded}/${b.subjective.possible}` : "—";

		const penalty = b?.tabSwitchDeduction ?? (res.tabSwitches * 10);
		const rawScore = b?.scoreBeforeDeduction ?? res.totalMarksAwarded;

		const row = s4.addRow({
			candidateId: res.candidate.id || "—",
			name: res.candidate.name,
			mcq: mcqVal,
			coding: codingVal,
			sql: sqlVal,
			subjective: subjVal,
			totalMarks: res.totalMarksPossible !== undefined ? res.totalMarksPossible : "—",
			marksAwarded: rawScore !== undefined ? rawScore : "Pending Evaluation",
			percentage: (res.totalMarksAwarded !== undefined && res.totalMarksPossible)
				? (res.totalMarksAwarded / res.totalMarksPossible)
				: "—",
			penalty,
			finalScore: res.totalMarksAwarded !== undefined ? res.totalMarksAwarded : "Pending Evaluation",
			duration: Math.round(res.secondsUsed / 60),
			submittedAt: res.submittedAt ? res.submittedAt.slice(0, 10) : "—",
			breakdown: b ? JSON.stringify(b) : "{}",
		});

		if (res.totalMarksAwarded !== undefined && res.totalMarksPossible) {
			row.getCell("percentage").numFmt = "0.0%";
		}
	});

	formatWorksheet(s4, ["Score Breakdown"]);

	// ----------------------------------------------------
	// SHEET 5: Interview Progress
	// ----------------------------------------------------
	const s5 = workbook.addWorksheet("Interview Progress");
	s5.columns = [
		{ header: "Candidate ID", key: "candidateId" },
		{ header: "Candidate Name", key: "name" },
		{ header: "Hiring Status", key: "hiringStatus" },
		{ header: "Current Round", key: "currentRound" },
		{ header: "Assigned Interviewer", key: "assignedInterviewer" },
		{ header: "Interview Completion Status", key: "completion" },
		{ header: "Final Decision", key: "decision" },
		{ header: "Round 1 (F2F) Status", key: "r1Status" },
		{ header: "Round 1 Evaluator", key: "r1Name" },
		{ header: "Round 1 Date", key: "r1Date" },
		{ header: "Round 1 Remarks", key: "r1Remarks" },
		{ header: "Round 2 (Assessment) Status", key: "r2Status" },
		{ header: "Round 2 Evaluator", key: "r2Name" },
		{ header: "Round 2 Date", key: "r2Date" },
		{ header: "Round 2 Remarks", key: "r2Remarks" },
		{ header: "Round 3 (Director) Status", key: "r3Status" },
		{ header: "Round 3 Evaluator", key: "r3Name" },
		{ header: "Round 3 Date", key: "r3Date" },
		{ header: "Round 3 Remarks", key: "r3Remarks" },
	];

	results.forEach((res) => {
		const computedStatus = computeCandidateStatus(res);

		const r1 = res.interviewRounds?.face_to_face;
		const r2 = res.interviewRounds?.assessment;
		const r3 = res.interviewRounds?.director;

		const isCompleted = !!res.directorDecision || computedStatus === "hired" || computedStatus === "rejected" || computedStatus === "on_hold";
		const completionStatus = isCompleted ? "Completed" : (computedStatus === "screening" ? "Screening" : "In Progress");

		const finalDecision = computedStatus === "hired" ? "Hired"
			: computedStatus === "rejected" ? "Rejected"
			: computedStatus === "on_hold" ? "On Hold"
			: "Pending";

		const formatStatus = (s: string) => {
			if (s === "in_interview") return "In Interview";
			if (s === "on_hold") return "On Hold";
			if (s === "screening") return "Screening";
			if (s === "hired") return "Hired";
			if (s === "rejected") return "Rejected";
			return s;
		};

		s5.addRow({
			candidateId: res.candidate.id || "—",
			name: res.candidate.name,
			hiringStatus: formatStatus(computedStatus),
			currentRound: getRoundLabel(res),
			assignedInterviewer: res.assignedInterviewerName || "Unassigned",
			completion: completionStatus,
			decision: finalDecision,
			r1Status: r1?.status ?? "pending",
			r1Name: r1?.interviewerName || "Unassigned",
			r1Date: r1?.updatedAt ? r1.updatedAt.slice(0, 10) : "—",
			r1Remarks: r1?.remarks || "",
			r2Status: r2?.status ?? "pending",
			r2Name: r2?.interviewerName || "Unassigned",
			r2Date: r2?.updatedAt ? r2.updatedAt.slice(0, 10) : "—",
			r2Remarks: r2?.remarks || "",
			r3Status: res.directorDecision ? res.directorDecision.toUpperCase() : "pending",
			r3Name: r3?.interviewerName || "Unassigned",
			r3Date: r3?.updatedAt ? r3.updatedAt.slice(0, 10) : "—",
			r3Remarks: r3?.remarks || "",
		});
	});

	formatWorksheet(s5, ["Round 1 Remarks", "Round 2 Remarks", "Round 3 Remarks"]);

	// Write buffer to file triggers
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
	const url = window.URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	const dateStr = new Date().toISOString().slice(0, 10);
	anchor.download = `candidate_pipeline_export_${dateStr}.xlsx`;
	anchor.click();
	window.URL.revokeObjectURL(url);
}
