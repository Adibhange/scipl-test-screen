/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CandidateExperienceType, CandidateReferenceType } from "@/types";

export interface ICandidatesAdapter {
	getById(id: string): Promise<any>;
	getByEmail(email: string): Promise<any>;
	getWithDetailsByEmail(email: string): Promise<any>;
	create(data: any): Promise<any>;
	update(id: string, data: any): Promise<any>;
	checkReapplicationLockout(
		email: string,
		mobile: string,
		roleId: string,
		candidateId?: string,
		months?: number,
	): Promise<boolean>;
	getRoleExperienceList(): Promise<any[]>;
	getDocuments(id: string): Promise<any>;
}

export interface IExamSessionsAdapter {
	getById(id: string): Promise<any>;
	getByCandidateId(candidateId: string): Promise<any>;
	create(data: any): Promise<any>;
	update(id: string, data: any): Promise<any>;
	deleteByCandidateId(candidateId: string): Promise<void>;
}

export interface IQuestionsAdapter {
	getAll(): Promise<any[]>;
	getByIds(ids: string[]): Promise<any[]>;
}

export interface IResultsAdapter {
	getAll(): Promise<any[]>;
	getById(id: string): Promise<any>;
	save(result: any): Promise<void>;
	insertProctoringLog(sessionId: string, violationType: string): Promise<void>;
	getProctoringLogsCount(sessionId: string, violationType: string): Promise<number>;
	getCandidateAnswer(sessionId: string, questionId: string): Promise<any>;
	updateCandidateAnswer(sessionId: string, questionId: string, data: any): Promise<void>;
}

export interface IAdminsAdapter {
	getById(userId: string): Promise<any>;
	getByEmail(email: string): Promise<any>;
	getAll(): Promise<any[]>;
	upsert(data: any): Promise<any>;
	update(userId: string, data: any): Promise<any>;
	delete(userId: string): Promise<void>;
}

export interface ISessionsAdapter {
	create(data: {
		sessionTokenHash: string;
		adminUserId: string;
		expiresAt: Date;
		ipAddress?: string | null;
		userAgent?: string | null;
	}): Promise<any>;
	getByHash(hash: string): Promise<any>;
	updateLastUsed(id: string, data: { ipAddress?: string | null; userAgent?: string | null }): Promise<void>;
	revoke(id: string): Promise<void>;
	revokeAllForUser(adminUserId: string): Promise<void>;
	deleteExpiredAndRevoked(cutoff: Date): Promise<number>;
}

export interface IMetadataAdapter {
	getMasterRoles(activeOnly?: boolean): Promise<any[]>;
	getMasterExperiences(activeOnly?: boolean): Promise<any[]>;
	getMasterHiringLocations(activeOnly?: boolean): Promise<any[]>;
	getMasterTestLocations(activeOnly?: boolean): Promise<any[]>;
	getAssessmentMetadata(activeOnly?: boolean): Promise<any[]>;
	getVacancies(activeOnly?: boolean): Promise<any[]>;
	createVacancy(data: any): Promise<any>;
	updateVacancy(id: string, data: any): Promise<any>;
	deleteVacancy(id: string): Promise<void>;
	createMasterItem(type: string, data: any): Promise<any>;
	updateMasterItem(type: string, id: string, data: any): Promise<any>;
	deleteMasterItem(type: string, id: string): Promise<void>;
	resolveRoleValue(value: string): Promise<any>;
	resolveExperienceValue(value: string): Promise<any>;
	resolveHiringLocationValue(value: string): Promise<any>;
	resolveTestLocationValue(value: string): Promise<any>;
}

export interface ICandidateExperiencesAdapter {
	create(data: Partial<CandidateExperienceType> & { candidate_id: string }): Promise<CandidateExperienceType>;
	update(id: string, data: Partial<CandidateExperienceType>): Promise<CandidateExperienceType>;
	delete(id: string): Promise<void>;
	getByCandidateId(candidateId: string): Promise<CandidateExperienceType[]>;
}

export interface ICandidateReferencesAdapter {
	create(data: Partial<CandidateReferenceType> & { candidate_id: string }): Promise<CandidateReferenceType>;
	update(id: string, data: Partial<CandidateReferenceType>): Promise<CandidateReferenceType>;
	delete(id: string): Promise<void>;
	getByCandidateId(candidateId: string): Promise<CandidateReferenceType[]>;
}

export type CandidateShareStatus = "active" | "revoked" | "expired";

export interface ICandidateSharesAdapter {
	getActiveByCandidateId(candidateId: string): Promise<any>;
	getByToken(token: string): Promise<any>;
	create(data: {
		candidate_id: string;
		validity_hours: 1 | 12 | 24;
		created_by: string;
		expires_at: string;
	}): Promise<any>;
	revoke(id: string, data: { revoked_by: string; revoke_reason?: string }): Promise<any>;
	markExpired(id: string): Promise<void>;
	recordAccess(id: string): Promise<void>;
	listActiveWithCandidate(): Promise<any[]>;
}

export interface IDatabaseAdapter {
	candidates: ICandidatesAdapter;
	examSessions: IExamSessionsAdapter;
	questions: IQuestionsAdapter;
	results: IResultsAdapter;
	admins: IAdminsAdapter;
	sessions: ISessionsAdapter;
	metadata: IMetadataAdapter;
	candidateExperiences: ICandidateExperiencesAdapter;
	candidateReferences: ICandidateReferencesAdapter;
	candidateShares: ICandidateSharesAdapter;
	questionPapers: IQuestionPapersAdapter;
	assessmentSnapshots: IAssessmentSnapshotsAdapter;
}

export interface IQuestionPapersAdapter {
	listAll(): Promise<any[]>;
	listByUploader(uploadedBy: string): Promise<any[]>;
	getById(id: string): Promise<any | null>;
	getWithItems(id: string): Promise<any | null>;
	getPublished(roleId: string, experienceId: string): Promise<any | null>;
	create(data: any): Promise<any>;
	createItems(items: any[]): Promise<void>;
	updateStatus(id: string, data: any): Promise<any>;
	delete(id: string): Promise<void>;
	replaceItems(
		paperId: string,
		actorId: string,
		actorRole: string,
		title: string,
		totalQuestions: number,
		totalMarks: number,
		questionCountByType: Record<string, number>,
		newItems: any[],
	): Promise<void>;
}

export interface IAssessmentSnapshotsAdapter {
	create(data: {
		session_id: string;
		paper_id: string;
		question_order: string[];
		option_order: Record<string, string[]>;
		snapshot_items: any[];
	}): Promise<any>;
	getBySessionId(sessionId: string): Promise<any | null>;
}
