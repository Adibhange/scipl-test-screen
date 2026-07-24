/**
 * One-time migration: question_documents → published Question Papers
 *
 * Groups all existing question_documents rows by (role, experience),
 * then inserts one question_papers + question_paper_items set per group,
 * all with status = 'published', version = 1.
 *
 * Run ONCE after deploying 20260728_question_papers.sql:
 *   node scripts/migrate-question-documents-to-papers.mjs
 *
 * Idempotent: skips groups that already have a published paper for the same role+experience.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
	console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
	process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s) {
	return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function resolveRoleId(roleValue) {
	// Apply mapping from question role name to database role value
	const qRoleNorm = normalizeStr(roleValue);
	let dbRoleVal = roleValue;
	if (qRoleNorm === "nextjsdeveloper") dbRoleVal = "reactjs_developer";
	if (qRoleNorm === "fullstackdeveloper") dbRoleVal = "nodejs_developer";
	if (qRoleNorm === "projectmanager") dbRoleVal = "manual_tester";
	if (qRoleNorm === "sqldeveloper") dbRoleVal = "sql_developer";

	const norm = normalizeStr(dbRoleVal);
	const { data } = await sb.from("master_roles").select("id, value").order("value");
	if (!data) return null;
	const match = data.find((r) => normalizeStr(r.value) === norm);
	return match?.id ?? null;
}

async function resolveExpId(expValue) {
	// Apply mapping from question experience name to database experience value
	const qExpNorm = normalizeStr(expValue);
	let dbExpVal = expValue;
	if (qExpNorm === "01") dbExpVal = "0_1_years";
	if (qExpNorm === "13") dbExpVal = "1_3_years";
	if (qExpNorm === "35") dbExpVal = "3_5_years";
	if (qExpNorm === "5") dbExpVal = "5_years";

	const norm = normalizeStr(dbExpVal);
	const { data } = await sb.from("master_experiences").select("id, value").order("value");
	if (!data) return null;
	const match = data.find((e) => normalizeStr(e.value) === norm);
	return match?.id ?? null;
}

function mapTypeStr(t) {
	const map = {
		mcq_single: "mcq_single",
		mcq_multi: "mcq_multi",
		output_prediction: "output_prediction",
		coding: "coding",
		sql: "sql",
		subjective: "subjective",
	};
	return map[t] ?? "subjective";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	console.log("Loading question_documents…");
	const { data: docs, error: docsErr } = await sb.from("question_documents").select("id, payload");
	if (docsErr) { console.error("Could not load question_documents:", docsErr.message); process.exit(1); }
	if (!docs || docs.length === 0) { console.log("No question_documents found — nothing to migrate."); return; }

	const questions = docs.map((d) => d.payload).filter(Boolean);
	console.log(`Found ${questions.length} questions.`);

	// Group by role + experience (normalized)
	const groups = {};
	for (const q of questions) {
		const key = `${normalizeStr(q.role)}||${normalizeStr(q.experience)}`;
		if (!groups[key]) groups[key] = { role: q.role, experience: q.experience, items: [] };
		groups[key].items.push(q);
	}

	const groupKeys = Object.keys(groups);
	console.log(`Grouped into ${groupKeys.length} role/experience combination(s).`);

	// Load a stable "system" admin user id (any hr)
	const { data: admins } = await sb.from("admin_users").select("user_id, name, role").eq("role", "hr").limit(1);
	const systemUser = admins?.[0] ?? { user_id: "00000000-0000-0000-0000-000000000000", name: "System Migration" };

	let created = 0;
	let skipped = 0;

	for (const key of groupKeys) {
		const group = groups[key];
		const roleId = await resolveRoleId(group.role);
		const expId = await resolveExpId(group.experience);

		if (!roleId || !expId) {
			console.warn(`  ⚠ Could not resolve role="${group.role}" or experience="${group.experience}" — skipping.`);
			skipped++;
			continue;
		}

		// Check if published paper already exists for this role+experience
		const { data: existing } = await sb.from("question_papers")
			.select("id")
			.eq("role_id", roleId)
			.eq("experience_id", expId)
			.eq("status", "published")
			.maybeSingle();

		if (existing) {
			console.log(`  ↳ Already has published paper for role="${group.role}" / exp="${group.experience}" — skipping.`);
			skipped++;
			continue;
		}

		// Count by type
		const countByType = {};
		for (const q of group.items) {
			const t = mapTypeStr(q.type);
			countByType[t] = (countByType[t] ?? 0) + 1;
		}
		const totalMarks = group.items.reduce((s, q) => s + (q.marks ?? 0), 0);

		const title = `${group.role} — ${group.experience} (v1 — Migrated)`;

		// Insert question_papers row
		const { data: paper, error: paperErr } = await sb.from("question_papers").insert({
			title,
			role_id: roleId,
			experience_id: expId,
			status: "published",
			uploaded_by: systemUser.user_id,
			uploaded_by_name: systemUser.name,
			approved_by: systemUser.user_id,
			approved_by_name: systemUser.name,
			approved_at: new Date().toISOString(),
			published_at: new Date().toISOString(),
			total_questions: group.items.length,
			total_marks: totalMarks,
			question_count_by_type: countByType,
			version: 1,
		}).select().single();

		if (paperErr) {
			console.error(`  ✗ Failed to create paper for "${group.role}" / "${group.experience}":`, paperErr.message);
			skipped++;
			continue;
		}

		// Build items
		const itemRows = group.items.map((q, idx) => {
			const qType = mapTypeStr(q.type);
			const isMCQ = ["mcq_single", "mcq_multi", "output_prediction"].includes(qType);

			let options = null;
			if (isMCQ && q.options && q.options.length > 0) {
				options = q.options.map((opt, i) => ({
					key: opt.id ?? String.fromCharCode(65 + i),
					text: opt.text ?? "",
					is_correct: opt.id === q.correctOptionId || (Array.isArray(q.correctOptionIds) && q.correctOptionIds.includes(opt.id)),
				}));
			}

			return {
				paper_id: paper.id,
				question_key: q.id ?? `Q-${idx + 1}`,
				question_type: qType,
				question_text: q.stem ?? q.question ?? "",
				marks: q.marks ?? 1,
				section: q.topic ?? null,
				code_language: q.type === "coding" ? (q.codeLanguage ?? "Any") : null,
				expected_answer: null,
				options,
				sort_order: idx,
			};
		});

		const { error: itemsErr } = await sb.from("question_paper_items").insert(itemRows);
		if (itemsErr) {
			console.error(`  ✗ Failed to insert items for "${group.role}" / "${group.experience}":`, itemsErr.message);
			// Rollback paper
			await sb.from("question_papers").delete().eq("id", paper.id);
			skipped++;
			continue;
		}

		console.log(`  ✓ Created paper "${title}" with ${group.items.length} questions.`);
		created++;
	}

	console.log(`\nMigration complete: ${created} papers created, ${skipped} skipped.`);
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
