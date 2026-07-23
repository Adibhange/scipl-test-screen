/**
 * Master session token utilities.
 *
 * Independent from Supabase-based Admin authentication. Uses a signed,
 * stateless HMAC token stored in an HTTP-only cookie so it can be verified
 * from both the Edge middleware and Node route handlers without a shared
 * session store.
 *
 * Token shape (base64url): `${payloadB64}.${signatureB64}`
 * Payload: { role: "master", iat: number, exp: number }
 */

export const MASTER_SESSION_COOKIE = "scipl_master_session";
export const MASTER_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

interface MasterSessionPayload {
	role: "master";
	iat: number;
	exp: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function createMasterSessionToken(secret: string): Promise<{ token: string; expiresAt: number }> {
	const now = Math.floor(Date.now() / 1000);
	const payload: MasterSessionPayload = {
		role: "master",
		iat: now,
		exp: now + MASTER_SESSION_MAX_AGE_SECONDS,
	};
	const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
	const payloadB64 = base64UrlEncode(payloadBytes);

	const key = await getHmacKey(secret);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
	const signatureB64 = base64UrlEncode(new Uint8Array(signature));

	return { token: `${payloadB64}.${signatureB64}`, expiresAt: payload.exp };
}

export async function verifyMasterSessionToken(token: string | undefined | null, secret: string): Promise<boolean> {
	if (!token) return false;
	const parts = token.split(".");
	if (parts.length !== 2) return false;
	const [payloadB64, signatureB64] = parts;

	try {
		const key = await getHmacKey(secret);
		const signatureBytes = base64UrlDecode(signatureB64);
		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			signatureBytes as BufferSource,
			new TextEncoder().encode(payloadB64),
		);
		if (!valid) return false;

		const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as MasterSessionPayload;
		if (payload.role !== "master") return false;
		if (payload.exp < Math.floor(Date.now() / 1000)) return false;
		return true;
	} catch {
		return false;
	}
}

/** Constant-time-ish comparison for the 6-digit master code against the stored SHA-256 hash. */
export async function verifyMasterCode(code: string, expectedHashHex: string): Promise<boolean> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
	const digestHex = Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	if (digestHex.length !== expectedHashHex.length) return false;
	let mismatch = 0;
	for (let i = 0; i < digestHex.length; i++) {
		mismatch |= digestHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
	}
	return mismatch === 0;
}
