import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("Missing DATABASE_URL environment variable.");
	process.exit(1);
}

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: databaseUrl,
		},
	},
});

async function main() {
	console.log("Applying unified trigger SQL migration to live database...");
	const sqlPath = path.join(process.cwd(), "supabase", "migrations", "20260727_unified_status_trigger.sql");
	const sql = fs.readFileSync(sqlPath, "utf8");

	await prisma.$executeRawUnsafe(sql);
	console.log("Successfully applied database trigger migration.");
}

main()
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
