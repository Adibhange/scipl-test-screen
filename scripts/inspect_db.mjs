import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
	console.error("Missing Supabase credentials in environment variables.");
	process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
	console.log("=== INSPECTING LIVE SUPABASE DATABASE RECORDS ===");

	console.log("\n1. Fetching recent Results...");
	const { data: results, error: resError } = await supabase
		.from("results")
		.select("*")
		.limit(5);

	if (resError) {
		console.error("Error fetching results:", resError);
	} else {
		console.log("Number of results found:", results.length);
		results.forEach((r, idx) => {
			console.log(`\n--- Result Record ${idx + 1} (${r.id}) ---`);
			console.log("Interview Rounds JSON:", JSON.stringify(r.interview_rounds, null, 2));
		});
	}

	console.log("\n2. Fetching recent Candidates...");
	const { data: candidates, error: candError } = await supabase
		.from("candidates")
		.select("*")
		.limit(1);

	if (candError) {
		console.error("Error fetching candidates:", candError);
	} else {
		console.log("Candidate keys:", Object.keys(candidates[0] || {}));
	}

	console.log("\n3. Fetching an Exam Session...");
	const { data: sessions, error: sessError } = await supabase
		.from("exam_sessions")
		.select("*")
		.limit(1);

	if (sessError) {
		console.error("Error fetching sessions:", sessError);
	} else {
		console.log("Exam Session keys:", Object.keys(sessions[0] || {}));
	}
}

run().catch(console.error);
