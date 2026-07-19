export type Candidate = {
	id?: string;
	name: string;
	mobile: string;
	email: string;
	role: string;
	experience: string;
	testLocation?: string;
	hiringLocation?: string;
	hiringStatus?: "screening" | "interviewing" | "offered" | "hired" | "rejected" | "on_hold";
	expectedSalary?: number;
	offerSalary?: number;
	hrNotes?: string;
};

export type AnswerValue = string | string[];

export type AdminGrade = "correct" | "partial" | "incorrect";
export type InterviewRoundKey = "face_to_face" | "assessment" | "director";
export type InterviewDecision = "pending" | "pass" | "fail";

export type InterviewRoundReview = {
	status: InterviewDecision;
	interviewerId?: string;
	interviewerName?: string;
	interviewerEmail?: string;
	remarks?: string;
	updatedAt?: string;
};

export type Answer = {
	questionId: string;
	questionTopic: string;
	questionType: string;
	answerValue: AnswerValue;
	isCorrect?: boolean;
	adminGrade?: AdminGrade;
	marksAwarded?: number;
};

export type CandidateResult = {
	id: string;
	candidate: Candidate;
	answers: Answer[];
	tabSwitches: number;
	secondsUsed: number;
	submittedAt: string;
	totalMarksAwarded?: number;
	totalMarksPossible?: number;
	scoreBreakdown?: {
		mcq: { awarded: number; possible: number };
		coding: { awarded: number; possible: number };
		sql: { awarded: number; possible: number };
		subjective: { awarded: number; possible: number };
		scoreBeforeDeduction: number;
		tabSwitchDeduction: number;
	};
	assignedInterviewerId?: string;
	assignedInterviewerName?: string;
	assignedInterviewerEmail?: string;
	interviewRounds?: Record<InterviewRoundKey, InterviewRoundReview>;
};

export type SavedAttempt = {
	version: string;
	candidateEmail: string;
	roundIdx: number;
	completedRounds: number[];
	current: number;
	answers: Record<string, AnswerValue>;
	flagged: Record<string, boolean>;
	secondsLeft: number;
	secondsUsed: number;
	tabSwitches: number;
	mcqFlagUses: number;
	hasStarted: boolean;
	showRoundGate: boolean;
	savedAt: number;
};
