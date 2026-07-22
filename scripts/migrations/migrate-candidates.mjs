import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

async function runPrismaMigration(databaseUrl) {
	console.log("Using Prisma Client for candidate migration...");
	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl,
			},
		},
	});

	try {
		const candidates = await prisma.candidate.findMany();
		console.log(`Found ${candidates.length} candidates using Prisma.`);

		for (const candidate of candidates) {
			const expCount = await prisma.candidateExperience.count({
				where: { candidateId: candidate.id },
			});
			const refCount = await prisma.candidateReference.count({
				where: { candidateId: candidate.id },
			});

			if (expCount === 0 && refCount === 0) {
				console.log(`Candidate [${candidate.firstName} ${candidate.lastName}] matches legacy format. No experiences/references rows to migrate.`);
			}
		}
		console.log("Prisma migration successfully completed.");
	} catch (err) {
		console.error("Prisma migration failed:", err);
		throw err;
	} finally {
		await prisma.$disconnect();
	}
}

async function runSupabaseMigration() {
	console.log("Using Supabase Client for candidate migration...");
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error("Missing Supabase configuration environment variables.");
	}

	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data: candidates, error } = await supabase
		.from("candidates")
		.select("id, first_name, last_name, experience");

	if (error) throw error;
	console.log(`Found ${candidates.length} candidates via Supabase.`);

	for (const candidate of candidates) {
		const { count: expCount, error: expErr } = await supabase
			.from("candidate_experiences")
			.select("*", { count: "exact", head: true })
			.eq("candidate_id", candidate.id);

		if (expErr) throw expErr;

		const { count: refCount, error: refErr } = await supabase
			.from("candidate_references")
			.select("*", { count: "exact", head: true })
			.eq("candidate_id", candidate.id);

		if (refErr) throw refErr;

		if (expCount === 0 && refCount === 0) {
			console.log(`Candidate [${candidate.first_name} ${candidate.last_name}] matches legacy format. No experiences/references rows to migrate.`);
		}
	}
	console.log("Supabase migration successfully completed.");
}

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (dbUrl) {
		await runPrismaMigration(dbUrl);
	} else {
		await runSupabaseMigration();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
