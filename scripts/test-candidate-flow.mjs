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

async function runTests() {
	console.log("=== STARTING QA END-TO-END VERIFICATION FLOW ===");

	// Generate a unique test candidate name
	const testEmail = `qa-test-${Date.now()}@example.com`;
	const testMobile = `9876${Math.floor(100000 + Math.random() * 900000)}`;

	console.log(`Test Email: ${testEmail}`);
	console.log(`Test Mobile: ${testMobile}`);

	// 1. Create a Candidate record
	console.log("1. Creating test candidate profile...");
	const { data: cand, error: candError } = await supabase
		.from("candidates")
		.insert({
			first_name: "QA Test",
			last_name: "Candidate",
			email: testEmail,
			mobile: testMobile,
			role: "8e0b8149-a96a-49e2-8f33-6430f3aee225", // SQL Developer ID
			experience: "42997954-f70e-4d2d-802d-0a8a54bd02b5", // 0-1 Years ID
			test_location: "65748bd3-4a73-4b9e-a880-92833e0a2634", // Home ID
			hiring_status: "screening",
		})
		.select()
		.single();

	if (candError || !cand) {
		throw new Error(`Failed to create candidate: ${candError?.message}`);
	}
	const candidateId = cand.id;
	console.log(`Candidate created successfully with ID: ${candidateId}`);

	// 2. Add Candidate Experiences
	console.log("2. Inserting candidate experience log entries...");
	const { data: expRow, error: expError } = await supabase
		.from("candidate_experiences")
		.insert({
			candidate_id: candidateId,
			company_name: "QA Old Company LLC",
			designation: "Junior Engineer",
			start_date: "2024-01-01T00:00:00.000Z",
			end_date: "2024-12-31T00:00:00.000Z",
			current_salary: 450000,
			notice_period: 30,
			is_current: false,
		})
		.select()
		.single();

	if (expError || !expRow) {
		throw new Error(`Failed to insert experience: ${expError?.message}`);
	}
	console.log(`Experience record inserted successfully with ID: ${expRow.id}`);

	// 3. Add Candidate References
	console.log("3. Inserting external candidate reference check...");
	const { data: refRow, error: refError } = await supabase
		.from("candidate_references")
		.insert({
			candidate_id: candidateId,
			reference_type: "EXTERNAL",
			name: "External HR QA",
			mobile: "9876543210",
		})
		.select()
		.single();

	if (refError || !refRow) {
		throw new Error(`Failed to insert reference: ${refError?.message}`);
	}
	console.log(`External reference record inserted successfully with ID: ${refRow.id}`);

	// 4. Verify Reads & Relations mapping
	console.log("4. Verifying relational select reads...");
	const { data: readCand, error: readError } = await supabase
		.from("candidates")
		.select(`
			id,
			first_name,
			last_name,
			experiences:candidate_experiences(id, company_name, designation),
			references:candidate_references(id, name, mobile)
		`)
		.eq("id", candidateId)
		.single();

	if (readError || !readCand) {
		throw new Error(`Failed to read relations: ${readError?.message}`);
	}
	console.log("Successfully retrieved candidate relations:");
	console.log(`- Experiences Count: ${readCand.experiences.length}`);
	console.log(`- References Count: ${readCand.references.length}`);

	if (readCand.experiences.length !== 1 || readCand.references.length !== 1) {
		throw new Error("Validation mismatch: expected exactly 1 experience and 1 reference record.");
	}

	// 5. Update experiences list (edit old, add new)
	console.log("5. Performing candidate experience updates...");
	const { error: updExpError } = await supabase
		.from("candidate_experiences")
		.update({ company_name: "QA Edited Old Company LLC" })
		.eq("id", expRow.id);

	if (updExpError) {
		throw new Error(`Failed to update experience: ${updExpError.message}`);
	}
	console.log("Experience record updated successfully.");

	// 6. Delete Candidate & Assert Cascading Deletes
	console.log("6. Deleting parent candidate to test cascade deletes...");
	const { error: delError } = await supabase
		.from("candidates")
		.delete()
		.eq("id", candidateId);

	if (delError) {
		throw new Error(`Failed to delete candidate: ${delError.message}`);
	}
	console.log("Candidate record deleted successfully.");

	// Verify child counts are now 0
	const { count: childExpCount, error: checkExpError } = await supabase
		.from("candidate_experiences")
		.select("*", { count: "exact", head: true })
		.eq("candidate_id", candidateId);

	if (checkExpError) throw checkExpError;

	const { count: childRefCount, error: checkRefError } = await supabase
		.from("candidate_references")
		.select("*", { count: "exact", head: true })
		.eq("candidate_id", candidateId);

	if (checkRefError) throw checkRefError;

	console.log("Cascade Deletes check counts:");
	console.log(`- Leftover Experiences: ${childExpCount}`);
	console.log(`- Leftover References: ${childRefCount}`);

	if (childExpCount !== 0 || childRefCount !== 0) {
		throw new Error("Orphan rows detected! Cascade deletes failed.");
	}

	console.log("=== QA END-TO-END VERIFICATION FLOW COMPLETED SUCCESSFULLY ===");
}

runTests().catch((err) => {
	console.error("QA tests failed:", err.message);
	process.exit(1);
});
