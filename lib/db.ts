import { PrismaClient } from "@prisma/client"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured before Prisma can be initialized.")
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Prisma 7 requires an adapter or a Prisma Postgres/Accelerate URL. This
// project uses the prisma+postgres URL created by Prisma Postgres.
export const db = globalForPrisma.prisma || new PrismaClient({
  accelerateUrl: databaseUrl,
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
