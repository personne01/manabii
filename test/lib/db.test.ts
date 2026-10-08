import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `lib/db.ts` validates `DATABASE_URL` at module load and memoizes the client
 * on `globalThis`, so every test imports it dynamically after fixing the
 * environment.
 *
 * `process.env` is snapshotted and replaced instead of being mutated through
 * `vi.stubEnv`, because assigning `undefined` to a real environment variable
 * coerces to the string `"undefined"` in Node and would silently defeat the
 * fail-fast assertions below.
 */
const originalEnv = process.env;

const TEST_DATABASE_URL =
  "postgresql://manabii:manabii@localhost:5432/manabii_unit_test";

/**
 * Clearing the memo is mandatory, not cosmetic: `lib/db.ts` reuses
 * `globalThis.prisma` when it is already set, so a client cached by an earlier
 * test would satisfy an import that is supposed to throw.
 * `Reflect.deleteProperty` avoids a type assertion on `globalThis`.
 */
function resetModuleRegistry(): void {
  vi.resetModules();
  Reflect.deleteProperty(globalThis, "prisma");
}

beforeEach(() => {
  process.env = { ...originalEnv };
  resetModuleRegistry();
});

afterEach(() => {
  process.env = originalEnv;
  resetModuleRegistry();
});

describe("DATABASE_URL validation", () => {
  it("fails by name when the variable is unset", async () => {
    delete process.env.DATABASE_URL;

    await expect(import("@/lib/db")).rejects.toThrow(
      "Missing required environment variable: DATABASE_URL",
    );
  });

  it("fails by name when the variable is empty", async () => {
    process.env.DATABASE_URL = "";

    await expect(import("@/lib/db")).rejects.toThrow(
      "Missing required environment variable: DATABASE_URL",
    );
  });

  it("constructs the client when the variable is present", async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;

    const { db } = await import("@/lib/db");

    expect(db).toBeDefined();
  });

  it("reuses a single client across repeated imports", async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;

    const first = await import("@/lib/db");
    const second = await import("@/lib/db");

    expect(first.db).toBe(second.db);
  });
});