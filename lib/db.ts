import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

/**
 * node-postgres defaults to 10 connections per pool, which is too many here on
 * two counts: serverless runs many instances that each hold their own pool, and
 * the local `prisma dev` server refuses more than three at once. These queries
 * are all short, so a small pool costs nothing. Raise it with DATABASE_POOL_MAX
 * against a database that can take it.
 */
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 3);

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: POOL_MAX,
    }),
  });
}

// Next dev reloads modules on every edit; reuse one client so we don't leak pools.
export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
