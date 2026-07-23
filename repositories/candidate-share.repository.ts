import { getDatabaseAdapter } from "@/database/client";
import { ConflictError, NotFoundError } from "@/lib/errors";

export type ShareValidityHours = 1 | 6 | 12;

export type ShareStatus = "active" | "revoked" | "expired" | "none";

export type ShareRecord = {
	id: string;
	candidateId: string;
	shareToken: string;
	status: ShareStatus;
	validityHours: ShareValidityHours;
	createdBy: string;
	createdAt: string;
	expiresAt: string;
	revokedBy: string | null;
	revokedAt: string | null;
	revokeReason: string | null;
	accessCount: number;
	lastAccessedAt: string | null;
};

/** Raw shape returned by the database adapter (snake_case columns). */
type CandidateShareRow = {
	id: string;
	candidate_id: string;
	share_token: string;
	status: ShareStatus;
	validity_hours: ShareValidityHours;
	created_by: string;
	created_at: string;
	expires_at: string;
	revoked_by: string | null;
	revoked_at: string | null;
	revoke_reason: string | null;
	access_count: number | null;
	last_accessed_at: string | null;
	candidates?: SharedCandidateSummary | null;
};

export type SharedCandidateSummary = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
};

function mapRecord(row: CandidateShareRow): ShareRecord {
	return {
		id: row.id,
		candidateId: row.candidate_id,
		shareToken: row.share_token,
		status: row.status,
		validityHours: row.validity_hours,
		createdBy: row.created_by,
		createdAt: row.created_at,
		expiresAt: row.expires_at,
		revokedBy: row.revoked_by,
		revokedAt: row.revoked_at,
		revokeReason: row.revoke_reason,
		accessCount: row.access_count ?? 0,
		lastAccessedAt: row.last_accessed_at,
	};
}

function isExpired(row: Pick<CandidateShareRow, "expires_at">): boolean {
	return new Date(row.expires_at).getTime() < Date.now();
}

/**
 * Returns the candidate's current share status, lazily flipping an
 * active-but-past-expiry row to "expired" so callers never see a stale
 * "active" link that has actually lapsed.
 */
export async function getShareStatus(candidateId: string): Promise<ShareRecord | null> {
	const adapter = getDatabaseAdapter().candidateShares;
	const active = await adapter.getActiveByCandidateId(candidateId);
	if (!active) return null;

	if (isExpired(active)) {
		await adapter.markExpired(active.id);
		return mapRecord({ ...active, status: "expired" });
	}

	return mapRecord(active);
}

/**
 * Generates a new share link for a candidate. Enforces "one active link per
 * candidate" — if an active, non-expired link already exists this throws a
 * ConflictError instead of silently returning it, matching the "Generate New
 * Link disabled until revoked" UX contract.
 */
export async function generateShareLink(params: {
	candidateId: string;
	validityHours: ShareValidityHours;
	createdBy: string;
}): Promise<ShareRecord> {
	const adapter = getDatabaseAdapter().candidateShares;
	const existing = await adapter.getActiveByCandidateId(params.candidateId);

	if (existing) {
		if (!isExpired(existing)) {
			throw new ConflictError("An active share link already exists for this candidate. Revoke it before generating a new one.");
		}
		// Lapsed but not yet flipped — archive it so the unique-active constraint doesn't block the insert.
		await adapter.markExpired(existing.id);
	}

	const expiresAt = new Date(Date.now() + params.validityHours * 60 * 60 * 1000).toISOString();
	const record = await adapter.create({
		candidate_id: params.candidateId,
		validity_hours: params.validityHours,
		created_by: params.createdBy,
		expires_at: expiresAt,
	});

	return mapRecord(record);
}

/**
 * Revokes the candidate's active share link. Old, revoked tokens are never
 * reused — a fresh UUID token is generated on the next `generateShareLink`.
 */
export async function revokeShareLink(params: {
	candidateId: string;
	revokedBy: string;
	reason?: string;
}): Promise<ShareRecord> {
	const adapter = getDatabaseAdapter().candidateShares;
	const existing = await adapter.getActiveByCandidateId(params.candidateId);
	if (!existing) {
		throw new NotFoundError("No active share link exists for this candidate.");
	}

	const revoked = await adapter.revoke(existing.id, {
		revoked_by: params.revokedBy,
		revoke_reason: params.reason,
	});

	if (!revoked) {
		throw new ConflictError("This share link was already revoked or is no longer active.");
	}

	return mapRecord(revoked);
}

/**
 * Validates a token from the shared URL. Returns null for any token that is
 * missing, revoked, or past its expiry — callers must treat null as "show the
 * generic expired/revoked message" and never leak *why* it failed.
 */
export async function validateShareToken(token: string): Promise<ShareRecord | null> {
	const adapter = getDatabaseAdapter().candidateShares;
	const record = await adapter.getByToken(token);
	if (!record) return null;
	if (record.status !== "active") return null;

	if (isExpired(record)) {
		await adapter.markExpired(record.id);
		return null;
	}

	await adapter.recordAccess(record.id);
	return mapRecord(record);
}

export async function listActiveShares(): Promise<Array<ShareRecord & { candidate: SharedCandidateSummary | null }>> {
	const adapter = getDatabaseAdapter().candidateShares;
	const rows: CandidateShareRow[] = await adapter.listActiveWithCandidate();
	return rows.map((row) => ({ ...mapRecord(row), candidate: row.candidates ?? null }));
}
