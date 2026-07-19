import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { connectionStringWithoutSslMode } from "@/lib/db-url";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: connectionStringWithoutSslMode(
      process.env.DATABASE_URL as string,
    ),
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

// Cache in all environments, not just dev: a warm serverless instance reuses
// this module scope across requests, and without caching here every request
// opened a brand-new connection pool that was never closed, exhausting
// Supabase's session-mode connection cap within a handful of requests.
globalThis.prismaGlobal = prisma;
