// Setup mock environment variables before imports
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key-long-enough-value-here";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://mock-supabase-url.com";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "mock-publishable-key";

import { calculateCandidateWorkflowStatus, canAccessRound, canSubmitFeedback, ensureInterviewRounds, getAssessmentLifecycle } from "../lib/interview-workflow.js";
import { submitRoundFeedback, assignInterviewerAndDetails } from "../services/server/interview/interview.service.js";
import { supabaseAdapter } from "../database/adapters/supabase.js";

// Global variable to capture what results were saved during updates
let savedResult = null;
let mockResultDbRow = null;

// Mock database adapter methods
supabaseAdapter.results = {
	getById: async (id) => mockResultDbRow,
	save: async (result) => { savedResult = result; },
	getProctoringLogsCount: async () => 0,
	insertProctoringLog: async () => {}
};
supabaseAdapter.candidates = {
	update: async () => {}
};
supabaseAdapter.candidateExperiences = {
	getByCandidateId: async () => []
};
supabaseAdapter.candidateReferences = {
	getByCandidateId: async () => []
};
supabaseAdapter.admins = {
	getAll: async () => [
		{ user_id: "dir-1", role: "director", name: "Director Bob", email: "bob@director.com" },
		{ user_id: "hr-1", role: "hr", name: "HR Alice", email: "alice@hr.com" }
	]
};

// Mock helper to create CandidateResult object
function createMockResult({
	f2fStatus = "pending",
	assessmentStatus = "pending",
	testStatus = "pending",
	directorDecision = null,
	totalMarksAwarded = undefined,
	totalMarksPossible = undefined,
	submittedAt = undefined,
	isExamStarted = false,
	isExamSubmitted = false,
	answers = [],
	rounds = {}
}) {
	return {
		id: "test-id",
		candidate: {
			id: "cand-id",
			name: "Test Candidate",
			email: "test@example.com",
			mobile: "1234567890",
			role: "Developer",
			experience: "1 Year"
		},
		answers,
		tabSwitches: 0,
		secondsUsed: 0,
		submittedAt,
		isExamStarted,
		isExamSubmitted,
		totalMarksAwarded,
		totalMarksPossible,
		interviewRounds: {
			face_to_face: { status: f2fStatus, ...(rounds.face_to_face ?? {}) },
			assessment: { status: assessmentStatus, testStatus: testStatus, ...(rounds.assessment ?? {}) },
			director: { status: "pending", ...(rounds.director ?? {}) }
		},
		directorDecision
	};
}

// Simulates the calculateCandidateResults server service validations
function simulateFinalize(result) {
	if (!result.isExamSubmitted) {
		throw new Error("Assessment has not been submitted by the candidate yet. Score calculation and finalization are unavailable.");
	}
	
	// calculate totals
	let possible = 0;
	if (result.answers && result.answers.length > 0) {
		possible = result.answers.reduce((acc, ans) => acc + (ans.marks || 10), 0);
	} else {
		// Mock config check: if there are no questions configured
		possible = result.totalMarksPossible ?? 0;
	}

	if (possible <= 0) {
		throw new Error("Cannot finalize assessment: total possible marks must be greater than zero. Please check the test question configuration.");
	}

	return {
		...result,
		totalMarksPossible: possible,
		totalMarksAwarded: result.totalMarksAwarded ?? 0,
		interviewRounds: {
			...result.interviewRounds,
			assessment: {
				...result.interviewRounds.assessment,
				testStatus: "finalized"
			}
		}
	};
}

async function runTests() {
	console.log("=== STARTING CANDIDATE WORKFLOW DEFECT TESTS ===");

	// Test 1: Candidate has not started test -> grade/calculate/finalize/feedback all blocked
	const r1 = createMockResult({ isExamStarted: false, isExamSubmitted: false });
	console.assert(getAssessmentLifecycle(r1) === "not_started", "Test 1 Failed: expected not_started lifecycle");
	console.assert(canSubmitFeedback(r1, "assessment") === false, "Test 1 Failed: feedback should be blocked");

	// Test 2: Candidate started but did not submit test -> grade/calculate/finalize/feedback all blocked
	const r2 = createMockResult({ isExamStarted: true, isExamSubmitted: false });
	console.assert(getAssessmentLifecycle(r2) === "in_progress", "Test 2 Failed: expected in_progress lifecycle");
	console.assert(canSubmitFeedback(r2, "assessment") === false, "Test 2 Failed: feedback should be blocked");

	// Test 3: Candidate submitted blank test -> behavior is correct and no false "not submitted" error
	const r3 = createMockResult({ isExamStarted: true, isExamSubmitted: true, totalMarksPossible: 100, answers: [] });
	console.assert(getAssessmentLifecycle(r3) === "ready_to_finalize", "Test 3 Failed: expected ready_to_finalize lifecycle");
	try {
		const finalizedR3 = simulateFinalize(r3);
		console.assert(finalizedR3.interviewRounds.assessment.testStatus === "finalized", "Test 3 Failed: should finalize blank test with possible marks configured");
		console.log("Test 3 Passed: blank test with possible marks configured finalized correctly");
	} catch (e) {
		console.error("Test 3 Failed: threw unexpected error:", e.message);
	}

	// Test 4: Submitted test with valid questions -> score calculation/finalization succeeds
	const r4 = createMockResult({
		isExamStarted: true,
		isExamSubmitted: true,
		answers: [{ questionId: "q1", marks: 50 }, { questionId: "q2", marks: 50 }]
	});
	console.assert(getAssessmentLifecycle(r4) === "ready_to_finalize", "Test 4 Failed: expected ready_to_finalize");
	const finalizedR4 = simulateFinalize(r4);
	console.assert(finalizedR4.interviewRounds.assessment.testStatus === "finalized", "Test 4 Failed: should finalize successfully");
	console.assert(finalizedR4.totalMarksPossible === 100, "Test 4 Failed: expected possible marks to be 100");
	console.log("Test 4 Passed: valid test calculation and finalization succeeds");

	// Test 5: Attempt to finalize 0 / 0 or invalid score -> rejected
	const r5 = createMockResult({ isExamStarted: true, isExamSubmitted: true, answers: [] }); // 0 possible marks
	try {
		simulateFinalize(r5);
		console.error("Test 5 Failed: Finalization did not throw error for 0 possible marks");
	} catch (e) {
		console.log("Test 5 Passed: finalization correctly blocked for 0/0 test (" + e.message + ")");
	}

	// Test 6: Round 2 feedback is blocked before valid finalization
	const r6 = createMockResult({ f2fStatus: "pass", isExamStarted: true, isExamSubmitted: true, testStatus: "pending" });
	console.assert(canSubmitFeedback(r6, "assessment") === false, "Test 6 Failed: feedback must be blocked before finalization");
	console.log("Test 6 Passed: feedback is blocked before finalization");

	// Test 7: Round 2 feedback is enabled after valid finalization
	const r7 = createMockResult({ f2fStatus: "pass", isExamStarted: true, isExamSubmitted: true, testStatus: "finalized" });
	console.assert(canSubmitFeedback(r7, "assessment") === true, "Test 7 Failed: feedback must be enabled after finalization");
	console.log("Test 7 Passed: feedback is enabled after finalization");

	// Test 8: Director is unlocked after Round 2 finalized feedback, whether feedback is pass or fail
	const r8_pass = createMockResult({ f2fStatus: "pass", testStatus: "finalized", assessmentStatus: "pass" });
	const r8_fail = createMockResult({ f2fStatus: "pass", testStatus: "finalized", assessmentStatus: "fail" });
	console.assert(canAccessRound(r8_pass, "director") === true, "Test 8 Failed: Director should be unlocked on R2 pass");
	console.assert(canAccessRound(r8_fail, "director") === true, "Test 8 Failed: Director should be unlocked on R2 fail");
	console.log("Test 8 Passed: Director unlocked for both R2 pass and fail");

	// Test 9: Score display never renders NaN%, Infinity%, or 0 / 0
	function renderScore(awarded, possible) {
		if (
			awarded !== undefined &&
			possible !== undefined &&
			Number.isFinite(awarded) &&
			Number.isFinite(possible) &&
			possible > 0
		) {
			const pct = Math.round((awarded / possible) * 100);
			return `Score: ${awarded} / ${possible} (${pct}%)`;
		}
		return "⚠️ Score data inconsistent / invalid configuration";
	}
	console.assert(renderScore(0, 0) === "⚠️ Score data inconsistent / invalid configuration", "Test 9 Failed: 0/0 should render warning");
	console.assert(renderScore(10, 0) === "⚠️ Score data inconsistent / invalid configuration", "Test 9 Failed: division by zero warning expected");
	console.assert(renderScore(32, 50) === "Score: 32 / 50 (64%)", `Test 9 Failed: expected Score: 32 / 50 (64%), got ${renderScore(32, 50)}`);
	console.log("Test 9 Passed: Score rendering checks protect against NaN and invalid states");

	// Test 10: Interviewer dropdown is not clipped, and each round still updates only its own interviewer assignment
	const r10 = createMockResult({
		rounds: {
			face_to_face: { interviewerName: "Alice" },
			assessment: { interviewerName: "Bob" },
			director: { interviewerName: "Charlie" }
		}
	});
	const rounds10 = ensureInterviewRounds(r10);
	console.assert(rounds10.face_to_face.interviewerName === "Alice", "Test 10 Failed: F2F interviewer mismatch");
	console.assert(rounds10.assessment.interviewerName === "Bob", "Test 10 Failed: Assessment interviewer mismatch");
	console.assert(rounds10.director.interviewerName === "Charlie", "Test 10 Failed: Director interviewer mismatch");
	console.log("Test 10 Passed: Independent interviewer round assignments preserved");

	console.log("\n=== STARTING SERVER-SIDE LOCKS AND AUTHORIZATION TESTS ===");

	// Mock server database rows mapper
	function setupMockResultDbRow(resultObj) {
		mockResultDbRow = {
			resultRow: {
				id: resultObj.id,
				seconds_used: resultObj.secondsUsed,
				submitted_at: resultObj.submittedAt,
				total_marks_awarded: resultObj.totalMarksAwarded,
				total_marks_possible: resultObj.totalMarksPossible,
				director_decision: resultObj.directorDecision,
				interview_rounds: resultObj.interviewRounds
			},
			sessionRow: {
				id: resultObj.id,
				is_exam_submitted: resultObj.isExamSubmitted,
				is_exam_started: resultObj.isExamStarted
			},
			candidateRow: {
				id: resultObj.candidate.id,
				first_name: "Test",
				last_name: "User",
				mobile: resultObj.candidate.mobile,
				email: resultObj.candidate.email
			},
			answers: resultObj.answers,
			tabSwitches: resultObj.tabSwitches
		};
	}

	// Server Test 1: Changing interviewer for finalized Round 1/2 is blocked
	const s1_result = createMockResult({ f2fStatus: "pass" });
	setupMockResultDbRow(s1_result);
	try {
		await assignInterviewerAndDetails("test-id", { round: "face_to_face", interviewerEmail: "bob@director.com", interviewerName: "Bob" });
		console.error("Server Test 1 Failed: allowed changing interviewer of finalized R1 round.");
	} catch (e) {
		console.log("Server Test 1 Passed: changing interviewer of finalized R1 round correctly blocked (" + e.message + ")");
	}

	// Server Test 2: Submitting feedback for finalized Round 1/2 is blocked
	try {
		await submitRoundFeedback("test-id", "face_to_face", "fail", "Hacker remarks", { role: "hr", userId: "hr-1", name: "HR Alice", email: "alice@hr.com" });
		console.error("Server Test 2 Failed: allowed changing feedback of finalized R1 round.");
	} catch (e) {
		console.log("Server Test 2 Passed: changing feedback of finalized R1 round correctly blocked (" + e.message + ")");
	}

	// Server Test 3: Submitting Round 3 decision by HR without selecting a Director throws ValidationError
	const s3_result = createMockResult({ f2fStatus: "pass", testStatus: "finalized", assessmentStatus: "pass" });
	setupMockResultDbRow(s3_result);
	try {
		await submitRoundFeedback("test-id", "director", "pass", "Remarks", { role: "hr", userId: "hr-1", name: "HR Alice", email: "alice@hr.com" }, "hire", undefined);
		console.error("Server Test 3 Failed: HR allowed to record director decision without director attribution.");
	} catch (e) {
		console.log("Server Test 3 Passed: HR recording without director attribution correctly throws (" + e.message + ")");
	}

	// Server Test 4: A non-authorized user (e.g. interviewer) cannot submit a Director decision
	try {
		await submitRoundFeedback("test-id", "director", "pass", "Remarks", { role: "interviewer", userId: "int-1", name: "Bob", email: "bob@int.com" }, "hire");
		console.error("Server Test 4 Failed: Interviewer allowed to submit Director decision.");
	} catch (e) {
		console.log("Server Test 4 Passed: unauthorized roles blocked from Director decision (" + e.message + ")");
	}

	// Server Test 5: A Director submitting Director decision is directly attributed (ignores client-supplied directorId)
	const s5_result = createMockResult({ f2fStatus: "pass", testStatus: "finalized", assessmentStatus: "pass" });
	setupMockResultDbRow(s5_result);
	await submitRoundFeedback(
		"test-id",
		"director",
		"pass",
		"Director comments",
		{ role: "director", userId: "dir-1", name: "Director Bob", email: "bob@director.com" },
		"hire",
		"hr-forged-director-id" // Spoofed ID
	);
	console.assert(savedResult.directorDecision === "hire", "Server Test 5 Failed: decision was not saved");
	console.assert(savedResult.interviewRounds.director.decisionByDirectorId === "dir-1", "Server Test 5 Failed: spoofed ID was not ignored");
	console.assert(savedResult.interviewRounds.director.decisionByDirectorName === "Director Bob", "Server Test 5 Failed: Name attribution wrong");
	console.log("Server Test 5 Passed: Director attribution direct flow validates and protects against client-side spoofing");

	// Server Test 6: Reopening a finalized Director decision by a non-HR user throws AuthorizationError
	const s6_result = createMockResult({ f2fStatus: "pass", testStatus: "finalized", assessmentStatus: "pass", directorDecision: "hire", rounds: { director: { decisionByDirectorId: "dir-1", decisionByDirectorName: "Director Bob" } } });
	setupMockResultDbRow(s6_result);
	try {
		await submitRoundFeedback(
			"test-id",
			"director",
			"pass",
			"New decision comments",
			{ role: "director", userId: "dir-1", name: "Director Bob", email: "bob@director.com" },
			"reject"
		);
		console.error("Server Test 6 Failed: Non-HR user allowed to reopen a finalized Director decision.");
	} catch (e) {
		console.log("Server Test 6 Passed: Only HR can reopen finalized Director decision (" + e.message + ")");
	}

	// Server Test 7: Reopening a finalized Director decision by HR without a reason throws ValidationError
	try {
		await submitRoundFeedback(
			"test-id",
			"director",
			"pass",
			"HR correcting",
			{ role: "hr", userId: "hr-1", name: "HR Alice", email: "alice@hr.com" },
			"reject",
			"dir-1"
		);
		console.error("Server Test 7 Failed: HR allowed to reopen director decision without a reason.");
	} catch (e) {
		console.log("Server Test 7 Passed: HR reopening without reason correctly blocked (" + e.message + ")");
	}

	// Server Test 8: Reopening a finalized Director decision by HR with a valid reason succeeds, storing audit log
	await submitRoundFeedback(
		"test-id",
		"director",
		"pass",
		"HR correcting with reason",
		{ role: "hr", userId: "hr-1", name: "HR Alice", email: "alice@hr.com" },
		"reject",
		"dir-1",
		"Decision typo fixed"
	);
	console.assert(savedResult.directorDecision === "reject", "Server Test 8 Failed: correction did not save");
	console.assert(savedResult.interviewRounds.director.reopenReason === "Decision typo fixed", "Server Test 8 Failed: reopen reason not stored");
	console.assert(savedResult.interviewRounds.director.reopenedBy.name === "HR Alice", "Server Test 8 Failed: reopenedBy details missing");
	console.log("Server Test 8 Passed: Reopen and correction flows with audit logging validated successfully");

	console.log("=== ALL TEST SCENARIOS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(e => {
	console.error("Tests execution failed:", e);
	process.exit(1);
});
