import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const [email, password, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim() || "HR Administrator";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !url || !serviceRoleKey) {
	console.error("Usage: npm run bootstrap:hr -- hr@example.com StrongPassword123 HR Administrator");
	process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

const roundsEnv = process.env.BCRYPT_ROUNDS;
const rounds = roundsEnv ? parseInt(roundsEnv, 10) : 12;
const saltRounds = isNaN(rounds) ? 12 : rounds;

const passwordHash = await bcrypt.hash(password, saltRounds);
const userId = crypto.randomUUID();

console.log("Running upsert for", email);
const { data, error: rowError } = await supabase.from("admin_users").upsert({
	user_id: userId,
	email: email.toLowerCase(),
	name,
	role: "hr",
	password_hash: passwordHash,
	active: true,
}, { onConflict: "user_id" }).select();

console.log("Upsert Result:", { data, rowError });

if (rowError) {
	console.error(`Could not create HR admin record: ${rowError.message}`);
	process.exit(1);
}

console.log(`HR admin ready: ${email.toLowerCase()}`);
