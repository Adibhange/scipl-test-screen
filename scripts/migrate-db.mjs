import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("Missing DATABASE_URL environment variable. Please apply the migration manually in the Supabase console, or run this script with DATABASE_URL set.");
	process.exit(0);
}

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: databaseUrl,
		},
	},
});

async function main() {
	console.log("Applying columns migration to database...");
	const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20260801_director_auth_columns.sql");
	const sql = fs.readFileSync(sqlPath, "utf8");

	// Prisma executeRawUnsafe runs multiple queries separated by semicolons differently depending on setup.
	// Splitting statements by semicolon is safer.
	const statements = sql
		.split(";")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const stmt of statements) {
		console.log(`Executing statement: ${stmt.slice(0, 50)}...`);
		await prisma.$executeRawUnsafe(stmt);
	}
	console.log("Successfully applied database columns migration.");
}

main()
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
