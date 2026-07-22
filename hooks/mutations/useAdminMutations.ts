import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
	createAdminUser,
	updateAdminUser,
	createAdminConfiguration,
	updateAdminConfiguration,
	deleteAdminConfiguration,
	preRegisterCandidate,
	gradeCandidateAnswer,
} from "@/services/client/admin.service";

export function useCreateAdminUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createAdminUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
		},
	});
}

export function useUpdateAdminUserMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateAdminUser,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.admin.staff() });
		},
	});
}

export function useCreateAdminConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createAdminConfiguration,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.admin.config() });
		},
	});
}

export function useUpdateAdminConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateAdminConfiguration,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.admin.config() });
		},
	});
}

export function useDeleteAdminConfigMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, isVacancy, type }: { id: string; isVacancy: boolean; type?: string }) =>
			deleteAdminConfiguration(id, isVacancy, type),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.admin.config() });
		},
	});
}

export function usePreRegisterCandidateMutation() {
	return useMutation({
		mutationFn: preRegisterCandidate,
	});
}

export function useGradeCandidateAnswerMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: gradeCandidateAnswer,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.results.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.results.detail(variables.resultId) });
		},
	});
}
