import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Prisma 7 generates a TypeScript client to app/generated/prisma rather than
 * into node_modules, so it is imported from that path rather than from
 * "@prisma/client".
 *
 * Prisma 7 also requires every connection to go through a driver adapter. The
 * client no longer opens its own database connection from a URL, so the
 * adapter owns the pg pool and is handed the same URL. Without this the
 * constructor is not callable.
 *
 * Next.js re-evaluates modules on every hot reload in development. Without
 * caching the client on globalThis, each reload would open a new connection
 * pool until Postgres refuses connections. The intersection assertion adds one
 * optional property to the ambient global type and changes no runtime value.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];

  if (connectionString === undefined || connectionString === "") {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}