/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { IDatabaseAdapter } from "../types";
import type { CandidateExperienceType, CandidateReferenceType } from "@/types";
import { env } from "@/env";
import { logger } from "@/lib/logger";

let client: SupabaseClient | undefined;

/**
 * Server-only Supabase client wrapper.
 */
export function getSupabaseServerClient(): SupabaseClient {
	if (client) return client;
	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceRoleKey) {
		throw new Error(
			"Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
		);
	}
	client = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	return client;
}

/**
 * Create a Supabase server client for SSR with browser cookies context.
 */
export async function createSupabaseServerClient() {
	const cookieStore = await cookies();
	const url = env.NEXT_PUBLIC_SUPABASE_URL;
	const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !key) throw new Error("Supabase server environment is not configured");

	return createServerClient(url, key, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, {
							...options,
							httpOnly: true,
							secure: env.NODE_ENV === "production",
							sameSite: "lax",
						}),
					);
				} catch {
					// Server components cannot always write cookies
				}
			},
		},
	});
}

function handleDatabaseError(error: any, fallbackMessage: string): never {
	logger.error("Database operation failed", { detail: String(error) });
	throw new Error(fallbackMessage);
}

export const supabaseAdapter: IDatabaseAdapter = {
	candidates: {
		async getById(id: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidates")
				.select(`
					id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, created_at, vacancy_id,
					roleObj:master_roles(value),
					experienceObj:master_experiences(value),
					testLocObj:master_test_locations(value),
					hiringLocObj:master_hiring_locations(value),
					vacancyObj:job_vacancies(
						id,
						roleObj:master_roles(value, label),
						experienceObj:master_experiences(value, label),
						hiringLocObj:master_hiring_locations(value, label)
					)
				`)
				.eq("id", id)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not retrieve candidate details.");
			return data;
		},

		async getByEmail(email: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidates")
				.select(`
					id, first_name, last_name, mobile, email, vacancy_id, hiring_status, expected_salary, offer_salary, hr_notes, created_at,
					roleObj:master_roles(id, value),
					experienceObj:master_experiences(value),
					testLocObj:master_test_locations(value),
					hiringLocObj:master_hiring_locations(value)
				`)
				.ilike("email", email)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not query candidate by email.");
			return data;
		},

		async getWithDetailsByEmail(email: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidates")
				.select(`
					id, first_name, last_name, mobile, email, hiring_status, vacancy_id,
					roleObj:master_roles(id, value),
					experienceObj:master_experiences(value),
					testLocObj:master_test_locations(value),
					hiringLocObj:master_hiring_locations(value)
				`)
				.ilike("email", email)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not load candidate registration data.");
			return data;
		},

		async create(data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("candidates")
				.insert(data)
				.select(`
					id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id, created_at,
					hiringLocObj:master_hiring_locations(value)
				`)
				.single();

			if (error) handleDatabaseError(error, "Failed to register candidate record.");
			return record;
		},

		async update(id: string, data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("candidates")
				.update(data)
				.eq("id", id)
				.select()
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to update candidate record.");
			return record;
		},

		async checkReapplicationLockout(
			email: string,
			mobile: string,
			roleId: string,
			candidateId?: string,
			months = 3,
		) {
			const lockoutDate = new Date();
			lockoutDate.setMonth(lockoutDate.getMonth() - months);

			const supabase = getSupabaseServerClient();
			let query = supabase
				.from("candidates")
				.select("id, created_at")
				.eq("role", roleId)
				.or(`email.ilike.${email.trim()},mobile.eq.${mobile.trim()}`)
				.gt("created_at", lockoutDate.toISOString());

			if (candidateId) {
				query = query.neq("id", candidateId);
			}

			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to verify lockout constraints.");
			return !!(data && data.length > 0);
		},

		async getRoleExperienceList() {
			const { data, error } = await getSupabaseServerClient()
				.from("candidates")
				.select(`
					roleObj:master_roles(value),
					experienceObj:master_experiences(value)
				`);

			if (error) handleDatabaseError(error, "Could not fetch candidate role-experience list.");
			return data || [];
		},
	},

	examSessions: {
		async getById(id: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("exam_sessions")
				.select("*")
				.eq("id", id)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not load exam session.");
			return data;
		},

		async getByCandidateId(candidateId: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("exam_sessions")
				.select("*")
				.eq("candidate_id", candidateId)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not load exam session for candidate.");
			return data;
		},

		async create(data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("exam_sessions")
				.insert(data)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to initiate exam session.");
			return record;
		},

		async update(id: string, data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("exam_sessions")
				.update(data)
				.eq("id", id)
				.select()
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to update exam session details.");
			return record;
		},

		async deleteByCandidateId(candidateId: string) {
			const { error } = await getSupabaseServerClient()
				.from("exam_sessions")
				.delete()
				.eq("candidate_id", candidateId);

			if (error) handleDatabaseError(error, "Failed to clear existing exam session.");
		},
	},

	questions: {
		async getAll() {
			const { data, error } = await getSupabaseServerClient()
				.from("question_documents")
				.select("payload");

			if (error) handleDatabaseError(error, "Could not fetch assessment questions.");
			return data || [];
		},
		async getByIds(ids: string[]) {
			if (!ids || ids.length === 0) return [];
			const { data, error } = await getSupabaseServerClient()
				.from("question_documents")
				.select("payload")
				.in("id", ids);

			if (error) handleDatabaseError(error, "Could not fetch specific assessment questions.");
			return data || [];
		},
	},

	results: {
		async getAll() {
			const supabase = getSupabaseServerClient();
			// Fetch all results, exam sessions, candidates, and candidate answers in batch
			const { data: results, error: resultsError } = await supabase
				.from("results")
				.select("*");

			if (resultsError) handleDatabaseError(resultsError, "Could not fetch results.");
			if (!results || results.length === 0) return [];

			const sessionIds = results.map(r => r.id);

			const { data: sessions, error: sessionsError } = await supabase
				.from("exam_sessions")
				.select("*")
				.in("id", sessionIds);

			if (sessionsError) handleDatabaseError(sessionsError, "Could not load sessions context.");

			const candidateIds = (sessions || []).map(s => s.candidate_id);

			const { data: candidates, error: candidatesError } = await supabase
				.from("candidates")
				.select(`
					id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id,
					role:master_roles(value, label),
					experience:master_experiences(value, label),
					test_location:master_test_locations(value, label),
					hiring_location:master_hiring_locations(value, label)
				`)
				.in("id", candidateIds);

			if (candidatesError) handleDatabaseError(candidatesError, "Could not load candidates metadata.");

			const { data: answers, error: answersError } = await supabase
				.from("candidate_answers")
				.select("exam_session_id, question_id, question_topic, question_type, is_correct, admin_grade, marks_awarded")
				.in("exam_session_id", sessionIds);

			if (answersError) handleDatabaseError(answersError, "Could not retrieve candidate answers.");

			const { data: logs, error: logsError } = await supabase
				.from("proctoring_logs")
				.select("exam_session_id")
				.eq("violation_type", "tab_switch")
				.in("exam_session_id", sessionIds);

			if (logsError) handleDatabaseError(logsError, "Could not check proctoring violations.");

			return (results || []).map(row => {
				const session = (sessions || []).find(s => s.id === row.id);
				const candidate = session ? (candidates || []).find(c => c.id === session.candidate_id) : undefined;
				const candidateAnswers = (answers || []).filter(a => a.exam_session_id === row.id);
				const tabSwitches = (logs || []).filter(l => l.exam_session_id === row.id).length;

				return {
					row,
					session,
					candidate,
					answers: candidateAnswers,
					tabSwitches,
				};
			});
		},

		async getById(id: string) {
			const supabase = getSupabaseServerClient();
			const { data: resultRow, error: resultError } = await supabase
				.from("results")
				.select("*")
				.eq("id", id)
				.maybeSingle();

			if (resultError) handleDatabaseError(resultError, "Could not retrieve candidate result.");
			if (!resultRow) return null;

			const { data: sessionRow, error: sessionError } = await supabase
				.from("exam_sessions")
				.select("*")
				.eq("id", id)
				.maybeSingle();

			if (sessionError || !sessionRow) handleDatabaseError(sessionError, "Failed to load session mapping.");

			const { data: candidateRow, error: candidateError } = await supabase
				.from("candidates")
				.select(`
					id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id,
					role:master_roles(value, label),
					experience:master_experiences(value, label),
					test_location:master_test_locations(value, label),
					hiring_location:master_hiring_locations(value, label)
				`)
				.eq("id", sessionRow.candidate_id)
				.maybeSingle();

			if (candidateError || !candidateRow) handleDatabaseError(candidateError, "Failed to resolve candidate profile.");

			const { data: answers, error: answersError } = await supabase
				.from("candidate_answers")
				.select("*")
				.eq("exam_session_id", id);

			if (answersError) handleDatabaseError(answersError, "Failed to fetch candidate answer sheet.");

			const { count, error: logsError } = await supabase
				.from("proctoring_logs")
				.select("*", { count: "exact", head: true })
				.eq("exam_session_id", id)
				.eq("violation_type", "tab_switch");

			if (logsError) handleDatabaseError(logsError, "Failed to verify security violation records.");

			return {
				resultRow,
				sessionRow,
				candidateRow,
				answers: answers || [],
				tabSwitches: count || 0,
			};
		},

		async save(result: any) {
			const supabase = getSupabaseServerClient();

			const { error: resultError } = await supabase.from("results").upsert(
				{
					id: result.id,
					seconds_used: result.secondsUsed,
					submitted_at: result.submittedAt,
					total_marks_awarded: result.totalMarksAwarded ?? null,
					total_marks_possible: result.totalMarksPossible ?? null,
					score_breakdown: result.scoreBreakdown ?? null,
					interview_rounds: result.interviewRounds ?? null,
					director_decision: result.directorDecision ?? null,
					assigned_interviewer_id: result.assignedInterviewerId ?? null,
					assigned_interviewer_name: result.assignedInterviewerName ?? null,
					assigned_interviewer_email: result.assignedInterviewerEmail ?? null,
				},
				{ onConflict: "id" },
			);

			if (resultError) handleDatabaseError(resultError, "Failed to persist result record.");

			if (result.answers && result.answers.length > 0) {
				const answersData = result.answers.map((ans: any) => ({
					exam_session_id: result.id,
					question_id: ans.questionId,
					question_topic: ans.questionTopic,
					question_type: ans.questionType,
					answer_value: ans.answerValue,
					is_correct: ans.isCorrect ?? null,
					admin_grade: ans.adminGrade ?? null,
					marks_awarded: ans.marksAwarded ?? 0,
				}));

				const { error: answersError } = await supabase.from("candidate_answers").upsert(
					answersData,
					{ onConflict: "exam_session_id,question_id" },
				);

				if (answersError) handleDatabaseError(answersError, "Failed to save answers payload.");
			}
		},

		async insertProctoringLog(sessionId: string, violationType: string) {
			const { error } = await getSupabaseServerClient()
				.from("proctoring_logs")
				.insert({
					exam_session_id: sessionId,
					violation_type: violationType,
				});

			if (error) handleDatabaseError(error, "Could not record security violation log.");
		},

		async getProctoringLogsCount(sessionId: string, violationType: string) {
			const { count, error } = await getSupabaseServerClient()
				.from("proctoring_logs")
				.select("*", { count: "exact", head: true })
				.eq("exam_session_id", sessionId)
				.eq("violation_type", violationType);

			if (error) handleDatabaseError(error, "Could not retrieve proctoring alerts count.");
			return count || 0;
		},

		async getCandidateAnswer(sessionId: string, questionId: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidate_answers")
				.select("id")
				.eq("exam_session_id", sessionId)
				.eq("question_id", questionId)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not locate answer row.");
			return data;
		},

		async updateCandidateAnswer(sessionId: string, questionId: string, data: any) {
			const { error } = await getSupabaseServerClient()
				.from("candidate_answers")
				.update(data)
				.eq("exam_session_id", sessionId)
				.eq("question_id", questionId);

			if (error) handleDatabaseError(error, "Could not submit grade for the answer.");
		},
	},

	admins: {
		async getById(userId: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("admin_users")
				.select("user_id, email, name, role")
				.eq("user_id", userId)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Could not fetch admin user.");
			return data;
		},

		async getAll() {
			const { data, error } = await getSupabaseServerClient()
				.from("admin_users")
				.select("user_id, email, name, role, created_at")
				.order("created_at", { ascending: false });

			if (error) handleDatabaseError(error, "Could not load admin team roster.");
			return data || [];
		},

		async upsert(data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("admin_users")
				.upsert(data, { onConflict: "user_id" })
				.select("user_id, email, name, role")
				.single();

			if (error) handleDatabaseError(error, "Could not register admin user details.");
			return record;
		},

		async update(userId: string, data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("admin_users")
				.update(data)
				.eq("user_id", userId)
				.select("user_id, email, name, role")
				.single();

			if (error) handleDatabaseError(error, "Could not update admin profile.");
			return record;
		},

		async delete(userId: string) {
			const { error } = await getSupabaseServerClient()
				.from("admin_users")
				.delete()
				.eq("user_id", userId);

			if (error) handleDatabaseError(error, "Failed to remove admin user.");
		},

		async authCreateUser(email: string, password: string) {
			const supabase = getSupabaseServerClient();
			const { data, error } = await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true,
			});
			if (error) handleDatabaseError(error, "Failed to create Auth admin account.");
			return data;
		},

		async authUpdateUser(userId: string, data: any) {
			const supabase = getSupabaseServerClient();
			const { error } = await supabase.auth.admin.updateUserById(userId, data);
			if (error) handleDatabaseError(error, "Failed to update Auth admin account.");
		},

		async authListUsers() {
			const supabase = getSupabaseServerClient();
			const { data, error } = await supabase.auth.admin.listUsers();
			if (error) handleDatabaseError(error, "Failed to list Auth admin accounts.");
			return data.users;
		},
	},

	metadata: {
		async getMasterRoles(activeOnly = true) {
			const query = getSupabaseServerClient().from("master_roles").select("*");
			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load roles configuration.");
			return data || [];
		},

		async getMasterExperiences(activeOnly = true) {
			const query = getSupabaseServerClient().from("master_experiences").select("*");
			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load experiences configuration.");
			return data || [];
		},

		async getMasterHiringLocations(activeOnly = true) {
			const query = getSupabaseServerClient().from("master_hiring_locations").select("*");
			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load hiring locations config.");
			return data || [];
		},

		async getMasterTestLocations(activeOnly = true) {
			const query = getSupabaseServerClient().from("master_test_locations").select("*");
			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load test locations config.");
			return data || [];
		},

		async getAssessmentMetadata(activeOnly = true) {
			const query = getSupabaseServerClient().from("assessment_metadata").select("*");
			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load assessment fallback config.");
			return data || [];
		},

		async getVacancies(activeOnly = true) {
			const query = getSupabaseServerClient()
				.from("job_vacancies")
				.select(`
					id, openings, is_active, test_locations, created_at,
					roleObj:master_roles(id, value, label),
					experienceObj:master_experiences(value, label),
					hiringLocObj:master_hiring_locations(value, label)
				`)
				.order("created_at", { ascending: true });

			if (activeOnly) query.eq("is_active", true);
			const { data, error } = await query;
			if (error) handleDatabaseError(error, "Failed to load active job vacancies.");
			return data || [];
		},

		async createVacancy(data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("job_vacancies")
				.insert(data)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to create new vacancy.");
			return record;
		},

		async updateVacancy(id: string, data: any) {
			const { data: record, error } = await getSupabaseServerClient()
				.from("job_vacancies")
				.update(data)
				.eq("id", id)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to update vacancy status.");
			return record;
		},

		async deleteVacancy(id: string) {
			const { error } = await getSupabaseServerClient()
				.from("job_vacancies")
				.delete()
				.eq("id", id);

			if (error) handleDatabaseError(error, "Failed to delete vacancy.");
		},

		async createMasterItem(type: string, data: any) {
			let table = "";
			if (type === "role") table = "master_roles";
			else if (type === "experience") table = "master_experiences";
			else if (type === "hiring_location") table = "master_hiring_locations";
			else if (type === "test_location") table = "master_test_locations";
			else throw new Error(`Unsupported config type: ${type}`);

			const { data: record, error } = await getSupabaseServerClient()
				.from(table)
				.insert(data)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to register layout parameter.");
			return record;
		},

		async updateMasterItem(type: string, id: string, data: any) {
			let table = "";
			if (type === "role") table = "master_roles";
			else if (type === "experience") table = "master_experiences";
			else if (type === "hiring_location") table = "master_hiring_locations";
			else if (type === "test_location") table = "master_test_locations";
			else throw new Error(`Unsupported config type: ${type}`);

			const { data: record, error } = await getSupabaseServerClient()
				.from(table)
				.update(data)
				.eq("id", id)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to update layout parameter.");
			return record;
		},

		async deleteMasterItem(type: string, id: string) {
			let table = "";
			if (type === "role") table = "master_roles";
			else if (type === "experience") table = "master_experiences";
			else if (type === "hiring_location") table = "master_hiring_locations";
			else if (type === "test_location") table = "master_test_locations";
			else throw new Error(`Unsupported config type: ${type}`);

			const { error } = await getSupabaseServerClient()
				.from(table)
				.delete()
				.eq("id", id);

			if (error) handleDatabaseError(error, "Failed to remove layout parameter.");
		},

		async resolveRoleValue(value: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("master_roles")
				.select("id")
				.eq("value", value)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to resolve role UUID.");
			return data;
		},

		async resolveExperienceValue(value: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("master_experiences")
				.select("id")
				.eq("value", value)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to resolve experience UUID.");
			return data;
		},

		async resolveHiringLocationValue(value: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("master_hiring_locations")
				.select("id")
				.eq("value", value)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to resolve hiring location UUID.");
			return data;
		},

		async resolveTestLocationValue(value: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("master_test_locations")
				.select("id")
				.eq("value", value)
				.maybeSingle();

			if (error) handleDatabaseError(error, "Failed to resolve test location UUID.");
			return data;
		},
	},
	candidateExperiences: {
		async create(data: Partial<CandidateExperienceType> & { candidate_id: string }) {
			const dbRecord = {
				candidate_id: data.candidateId || data.candidate_id,
				company_name: data.companyName,
				designation: data.designation,
				start_date: data.joiningDate,
				end_date: data.leavingDate,
				current_salary: data.salary,
				notice_period: data.noticePeriod,
				is_current: data.isCurrent,
			};

			const { data: record, error } = await getSupabaseServerClient()
				.from("candidate_experiences")
				.insert(dbRecord)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to save candidate experience record.");
			return {
				id: record.id,
				candidateId: record.candidate_id,
				companyName: record.company_name,
				designation: record.designation,
				joiningDate: record.start_date,
				leavingDate: record.end_date,
				salary: record.current_salary ? Number(record.current_salary) : null,
				noticePeriod: record.notice_period,
				isCurrent: record.is_current,
				createdAt: record.created_at,
				updatedAt: record.updated_at,
			};
		},

		async update(id: string, data: Partial<CandidateExperienceType>) {
			const dbRecord: any = {};
			if (data.candidateId !== undefined) dbRecord.candidate_id = data.candidateId;
			if (data.companyName !== undefined) dbRecord.company_name = data.companyName;
			if (data.designation !== undefined) dbRecord.designation = data.designation;
			if (data.joiningDate !== undefined) dbRecord.start_date = data.joiningDate;
			if (data.leavingDate !== undefined) dbRecord.end_date = data.leavingDate;
			if (data.salary !== undefined) dbRecord.current_salary = data.salary;
			if (data.noticePeriod !== undefined) dbRecord.notice_period = data.noticePeriod;
			if (data.isCurrent !== undefined) dbRecord.is_current = data.isCurrent;

			const { data: record, error } = await getSupabaseServerClient()
				.from("candidate_experiences")
				.update(dbRecord)
				.eq("id", id)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to update candidate experience record.");
			return {
				id: record.id,
				candidateId: record.candidate_id,
				companyName: record.company_name,
				designation: record.designation,
				joiningDate: record.start_date,
				leavingDate: record.end_date,
				salary: record.current_salary ? Number(record.current_salary) : null,
				noticePeriod: record.notice_period,
				isCurrent: record.is_current,
				createdAt: record.created_at,
				updatedAt: record.updated_at,
			};
		},

		async delete(id: string) {
			const { error } = await getSupabaseServerClient()
				.from("candidate_experiences")
				.delete()
				.eq("id", id);

			if (error) handleDatabaseError(error, "Failed to delete candidate experience record.");
		},

		async getByCandidateId(candidateId: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidate_experiences")
				.select("*")
				.eq("candidate_id", candidateId);

			if (error) handleDatabaseError(error, "Failed to fetch candidate experience list.");
			return (data || []).map((row: any) => ({
				id: row.id,
				candidateId: row.candidate_id,
				companyName: row.company_name,
				designation: row.designation,
				joiningDate: row.start_date,
				leavingDate: row.end_date,
				salary: row.current_salary ? Number(row.current_salary) : null,
				noticePeriod: row.notice_period,
				isCurrent: row.is_current,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			}));
		},
	},
	candidateReferences: {
		async create(data: Partial<CandidateReferenceType> & { candidate_id: string }) {
			let employeeId = null;
			const refType = data.referenceType;
			const empCode = data.employeeCode;
			
			if (refType === "INTERNAL" && empCode) {
				const { data: emp } = await getSupabaseServerClient()
					.from("employees")
					.select("id")
					.eq("employee_code", empCode)
					.maybeSingle();
				if (emp) employeeId = emp.id;
			}

			const dbRecord = {
				candidate_id: data.candidateId || data.candidate_id,
				reference_type: refType,
				name: data.referenceName,
				mobile: data.referenceMobile,
				employee_id: employeeId,
				notes: data.notes,
				verified_by: data.verifiedBy,
			};

			const { data: record, error } = await getSupabaseServerClient()
				.from("candidate_references")
				.insert(dbRecord)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to save candidate reference record.");
			return {
				id: record.id,
				candidateId: record.candidate_id,
				referenceType: record.reference_type,
				referenceName: record.name,
				referenceMobile: record.mobile,
				employeeId: record.employee_id,
				notes: record.notes,
				verifiedBy: record.verified_by,
				createdAt: record.created_at,
				updatedAt: record.updated_at,
			};
		},

		async update(id: string, data: Partial<CandidateReferenceType>) {
			let employeeId = null;
			const refType = data.referenceType;
			const empCode = data.employeeCode;

			if (refType === "INTERNAL" && empCode) {
				const { data: emp } = await getSupabaseServerClient()
					.from("employees")
					.select("id")
					.eq("employee_code", empCode)
					.maybeSingle();
				if (emp) employeeId = emp.id;
			}

			const dbRecord: any = {};
			if (data.candidateId !== undefined) dbRecord.candidate_id = data.candidateId;
			if (refType !== undefined) dbRecord.reference_type = refType;
			if (data.referenceName !== undefined) dbRecord.name = data.referenceName;
			if (data.referenceMobile !== undefined) dbRecord.mobile = data.referenceMobile;
			if (data.notes !== undefined) dbRecord.notes = data.notes;
			if (data.verifiedBy !== undefined) dbRecord.verified_by = data.verifiedBy;
			if (employeeId) dbRecord.employee_id = employeeId;

			const { data: record, error } = await getSupabaseServerClient()
				.from("candidate_references")
				.update(dbRecord)
				.eq("id", id)
				.select()
				.single();

			if (error) handleDatabaseError(error, "Failed to update candidate reference record.");
			return {
				id: record.id,
				candidateId: record.candidate_id,
				referenceType: record.reference_type,
				referenceName: record.name,
				referenceMobile: record.mobile,
				employeeId: record.employee_id,
				notes: record.notes,
				verifiedBy: record.verified_by,
				createdAt: record.created_at,
				updatedAt: record.updated_at,
			};
		},

		async delete(id: string) {
			const { error } = await getSupabaseServerClient()
				.from("candidate_references")
				.delete()
				.eq("id", id);

			if (error) handleDatabaseError(error, "Failed to delete candidate reference record.");
		},

		async getByCandidateId(candidateId: string) {
			const { data, error } = await getSupabaseServerClient()
				.from("candidate_references")
				.select("*")
				.eq("candidate_id", candidateId);

			if (error) handleDatabaseError(error, "Failed to fetch candidate reference list.");
			return (data || []).map((row: any) => ({
				id: row.id,
				candidateId: row.candidate_id,
				referenceType: row.reference_type,
				referenceName: row.name,
				referenceMobile: row.mobile,
				employeeId: row.employee_id,
				notes: row.notes,
				verifiedBy: row.verified_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			}));
		},
	},
};
