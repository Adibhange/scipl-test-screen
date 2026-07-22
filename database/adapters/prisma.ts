/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { env } from "@/env";
import type { IDatabaseAdapter } from "../types";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export function getPrismaClient(): PrismaClient {
	if (globalForPrisma.prisma) {
		return globalForPrisma.prisma;
	}

	const prisma = new PrismaClient({
		log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
	});

	if (env.NODE_ENV !== "production") {
		globalForPrisma.prisma = prisma;
	}

	return prisma;
}

const notImplemented = (methodName: string): never => {
	throw new Error(`Method ${methodName} is not implemented in PrismaAdapter.`);
};

export const prismaAdapter: IDatabaseAdapter = {
	candidates: {
		getById: (id: string) => notImplemented("candidates.getById"),
		getByEmail: (email: string) => notImplemented("candidates.getByEmail"),
		getWithDetailsByEmail: (email: string) => notImplemented("candidates.getWithDetailsByEmail"),
		create: (data: any) => notImplemented("candidates.create"),
		update: (id: string, data: any) => notImplemented("candidates.update"),
		checkReapplicationLockout: (
			email: string,
			mobile: string,
			roleId: string,
			candidateId?: string,
			months?: number,
		) => notImplemented("candidates.checkReapplicationLockout"),
		getRoleExperienceList: () => notImplemented("candidates.getRoleExperienceList"),
	},

	examSessions: {
		getById: (id: string) => notImplemented("examSessions.getById"),
		getByCandidateId: (candidateId: string) => notImplemented("examSessions.getByCandidateId"),
		create: (data: any) => notImplemented("examSessions.create"),
		update: (id: string, data: any) => notImplemented("examSessions.update"),
		deleteByCandidateId: (candidateId: string) => notImplemented("examSessions.deleteByCandidateId"),
	},

	questions: {
		getAll: () => notImplemented("questions.getAll"),
		getByIds: (ids: string[]) => notImplemented("questions.getByIds"),
	},

	results: {
		getAll: () => notImplemented("results.getAll"),
		getById: (id: string) => notImplemented("results.getById"),
		save: (result: any) => notImplemented("results.save"),
		insertProctoringLog: (sessionId: string, violationType: string) => notImplemented("results.insertProctoringLog"),
		getProctoringLogsCount: (sessionId: string, violationType: string) => notImplemented("results.getProctoringLogsCount"),
		getCandidateAnswer: (sessionId: string, questionId: string) => notImplemented("results.getCandidateAnswer"),
		updateCandidateAnswer: (sessionId: string, questionId: string, data: any) => notImplemented("results.updateCandidateAnswer"),
	},

	admins: {
		getById: (userId: string) => notImplemented("admins.getById"),
		getAll: () => notImplemented("admins.getAll"),
		upsert: (data: any) => notImplemented("admins.upsert"),
		update: (userId: string, data: any) => notImplemented("admins.update"),
		delete: (userId: string) => notImplemented("admins.delete"),
		authCreateUser: (email: string, password: string) => notImplemented("admins.authCreateUser"),
		authUpdateUser: (userId: string, data: any) => notImplemented("admins.authUpdateUser"),
		authListUsers: () => notImplemented("admins.authListUsers"),
	},

	metadata: {
		getMasterRoles: (activeOnly?: boolean) => notImplemented("metadata.getMasterRoles"),
		getMasterExperiences: (activeOnly?: boolean) => notImplemented("metadata.getMasterExperiences"),
		getMasterHiringLocations: (activeOnly?: boolean) => notImplemented("metadata.getMasterHiringLocations"),
		getMasterTestLocations: (activeOnly?: boolean) => notImplemented("metadata.getMasterTestLocations"),
		getAssessmentMetadata: (activeOnly?: boolean) => notImplemented("metadata.getAssessmentMetadata"),
		getVacancies: (activeOnly?: boolean) => notImplemented("metadata.getVacancies"),
		createVacancy: (data: any) => notImplemented("metadata.createVacancy"),
		updateVacancy: (id: string, data: any) => notImplemented("metadata.updateVacancy"),
		deleteVacancy: (id: string) => notImplemented("metadata.deleteVacancy"),
		createMasterItem: (type: string, data: any) => notImplemented("metadata.createMasterItem"),
		updateMasterItem: (type: string, id: string, data: any) => notImplemented("metadata.updateMasterItem"),
		deleteMasterItem: (type: string, id: string) => notImplemented("metadata.deleteMasterItem"),
		resolveRoleValue: (value: string) => notImplemented("metadata.resolveRoleValue"),
		resolveExperienceValue: (value: string) => notImplemented("metadata.resolveExperienceValue"),
		resolveHiringLocationValue: (value: string) => notImplemented("metadata.resolveHiringLocationValue"),
		resolveTestLocationValue: (value: string) => notImplemented("metadata.resolveTestLocationValue"),
	},
};
