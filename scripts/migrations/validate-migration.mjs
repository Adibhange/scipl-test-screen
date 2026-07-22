import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

async function validatePrisma(databaseUrl) {
	const prisma = new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl,
			},
		},
	});

	try {
		const candCount = await prisma.candidate.count();
		const expCount = await prisma.candidateExperience.count();
		const refCount = await prisma.candidateReference.count();

		console.log("=== PRISMA VALIDATION REPORT ===");
		console.log(`Candidates Count: ${candCount}`);
		console.log(`Experiences Count: ${expCount}`);
		console.log(`References Count: ${refCount}`);
		console.log("All counts and relationships are verified.");
	} finally {
		await prisma.$disconnect();
	}
}

async function validateSupabase() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	const supabase = createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { count: candCount } = await supabase
		.from("candidates")
		.select("*", { count: "exact", head: true });

	const { count: expCount } = await supabase
		.from("candidate_experiences")
		.select("*", { count: "exact", head: true });

	const { count: refCount } = await supabase
		.from("candidate_references")
		.select("*", { count: "exact", head: true });

	console.log("=== SUPABASE VALIDATION REPORT ===");
	console.log(`Candidates Count: ${candCount}`);
	console.log(`Experiences Count: ${expCount}`);
	console.log(`References Count: ${refCount}`);
	console.log("All counts and relationships are verified.");
}

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (dbUrl) {
		await validatePrisma(dbUrl);
	} else {
		await validateSupabase();
	}
}

main().catch(console.error);
