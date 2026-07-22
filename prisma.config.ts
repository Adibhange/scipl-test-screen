import { defineConfig } from "prisma/config";

export default defineConfig({
	schema: "./prisma/schema.prisma",
	datasource: {
		url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/scipl_db",
	},
});
