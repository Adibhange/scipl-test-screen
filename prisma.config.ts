import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "./prisma/schema.prisma",
	datasource: {
		url: process.env.DATABASE_URL || "postgresql://root:password@localhost:5432/scipl_db",
	},
});
