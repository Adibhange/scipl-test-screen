import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminUsers, fetchAdminConfigurations } from "@/services/client/admin.service";
import { getCandidateMetadata } from "@/services/client/candidate.service";

export function useAdminUsersQuery() {
	return useQuery({
		queryKey: queryKeys.admin.staff(),
		queryFn: fetchAdminUsers,
	});
}

export function useAdminConfigurationsQuery() {
	return useQuery({
		queryKey: queryKeys.admin.config(),
		queryFn: fetchAdminConfigurations,
	});
}

export function useCandidateMetadataQuery() {
	return useQuery({
		queryKey: queryKeys.candidates.metadata(),
		queryFn: getCandidateMetadata,
	});
}
