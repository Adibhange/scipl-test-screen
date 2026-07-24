export interface CredentialStatus {
	valid: boolean;
	redirectUrl?: string;
}

export function checkCredentialStatus(admin: {
	role: string;
	mustChangeMasterPin?: boolean | null;
}): CredentialStatus {
	if (admin.role === "director" && admin.mustChangeMasterPin === true) {
		return {
			valid: false,
			redirectUrl: "/master/change-pin",
		};
	}
	return { valid: true };
}
