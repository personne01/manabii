import type { Session, User } from "next-auth";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/app/generated/prisma/client";

/**
 * `lib/auth.ts` reads Google credentials at module load, so every test imports
 * it dynamically after fixing the environment. Type-only imports above are
 * erased at compile time and therefore do not trigger that load.
 *
 * `process.env` is snapshotted and replaced instead of being mutated through
 * `vi.stubEnv`, because assigning `undefined` to a real environment variable
 * coerces to the string `"undefined"` in Node and would silently defeat the
 * fail-fast assertions below.
 */
const originalEnv = process.env;

const TEST_ENV = {
  DATABASE_URL: "postgresql://manabii:manabii@localhost:5432/manabii_unit_test",
  GOOGLE_CLIENT_ID: "unit-test-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "unit-test-client-secret",
} as const;

const SESSION_EXPIRY = "2099-01-01T00:00:00.000Z";

const USER_ID = "6f1b1b8e-0a2c-4d5e-9f10-2b3c4d5e6f70";

/**
 * `lib/db.ts` memoizes its client on `globalThis` whenever `NODE_ENV` is not
 * "production", which is always true under Vitest. Without clearing it, a client
 * cached by an earlier import would satisfy a later import that is meant to
 * fail fast. `Reflect.deleteProperty` avoids a type assertion on `globalThis`.
 */
function resetModuleRegistry(): void {
  vi.resetModules();
  Reflect.deleteProperty(globalThis, "prisma");
}

function buildSession(): Session {
  return { user: { id: "", role: "STUDENT" }, expires: SESSION_EXPIRY };
}

function buildUser(role: Role): User {
  return { id: USER_ID, role };
}

beforeEach(() => {
  process.env = { ...originalEnv, ...TEST_ENV };
  resetModuleRegistry();
});

afterEach(() => {
  process.env = originalEnv;
  resetModuleRegistry();
});

describe("attachIdentityToSession", () => {
  it("copies the adapter-loaded user id and role onto the session", async () => {
    const { attachIdentityToSession } = await import("@/lib/auth");

    const session = buildSession();
    const result = attachIdentityToSession({ session, user: buildUser("ADMIN") });

    expect(result.user.id).toBe(USER_ID);
    expect(result.user.role).toBe("ADMIN");
    expect(result).toBe(session);
  });

  it("propagates whichever role is stored instead of defaulting to one", async () => {
    const { attachIdentityToSession } = await import("@/lib/auth");
    const roles: Role[] = ["STUDENT", "CONTENT_EDITOR", "ADMIN"];

    for (const role of roles) {
      const result = attachIdentityToSession({
        session: buildSession(),
        user: buildUser(role),
      });

      expect(result.user.role).toBe(role);
    }
  });

  it("refuses a role-less adapter row rather than defaulting a role", async () => {
    const { attachIdentityToSession } = await import("@/lib/auth");
    const session = buildSession();

    expect(() =>
      attachIdentityToSession({ session, user: { id: USER_ID } }),
    ).toThrow("Adapter returned a user without a role");
    expect(session.user.id).toBe("");
  });

  it("preserves the fields the adapter already populated", async () => {
    const { attachIdentityToSession } = await import("@/lib/auth");

    const session: Session = {
      user: {
        id: "",
        role: "STUDENT",
        name: "Ada",
        email: "ada@example.test",
        image: null,
      },
      expires: SESSION_EXPIRY,
    };

    const result = attachIdentityToSession({
      session,
      user: buildUser("CONTENT_EDITOR"),
    });

    expect(result.user.name).toBe("Ada");
    expect(result.user.email).toBe("ada@example.test");
    expect(result.user.image).toBeNull();
    expect(result.expires).toBe(SESSION_EXPIRY);
  });
});

describe("authOptions wiring", () => {
  it("keeps sessions in the database so they can be revoked server-side", async () => {
    const { authOptions } = await import("@/lib/auth");

    expect(authOptions.session?.strategy).toBe("database");
  });

  it("delegates persistence to the Prisma adapter", async () => {
    const { authOptions } = await import("@/lib/auth");

    expect(authOptions.adapter).toBeDefined();
  });

  it("registers exactly one provider built from the Google credentials in the environment", async () => {
    const { authOptions } = await import("@/lib/auth");

    expect(authOptions.providers).toHaveLength(1);

    const provider = authOptions.providers[0];
    if (provider.type !== "oauth") {
      throw new Error("Expected the registered provider to be an OAuth provider");
    }

    expect(provider.id).toBe("google");

    // next-auth v4 nests whatever is passed to `GoogleProvider()` under
    // `options` and only flattens it inside `parseProviders()` at request
    // time, so `provider.clientId` is `undefined` here even though the
    // declared `OAuthConfig` type claims otherwise. Assert against the
    // location the credentials really occupy.
    const configured = provider.options;
    if (
      typeof configured?.clientId !== "string" ||
      typeof configured?.clientSecret !== "string"
    ) {
      throw new Error("expected the Google provider to carry string credentials");
    }

    expect(configured.clientId).toBe(TEST_ENV.GOOGLE_CLIENT_ID);
    expect(configured.clientSecret).toBe(TEST_ENV.GOOGLE_CLIENT_SECRET);
  });

  it("wires the same session callback the tests exercise", async () => {
    const { attachIdentityToSession, authOptions } = await import("@/lib/auth");

    expect(authOptions.callbacks?.session).toBe(attachIdentityToSession);
  });
});

describe("missing Google credentials fail fast by name", () => {
  it("names GOOGLE_CLIENT_ID when it is unset", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    await expect(import("@/lib/auth")).rejects.toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_ID",
    );
  });

  it("names GOOGLE_CLIENT_ID when it is empty", async () => {
    process.env.GOOGLE_CLIENT_ID = "";

    await expect(import("@/lib/auth")).rejects.toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_ID",
    );
  });

  it("names GOOGLE_CLIENT_SECRET when it is unset", async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;

    await expect(import("@/lib/auth")).rejects.toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_SECRET",
    );
  });

  it("names GOOGLE_CLIENT_SECRET when it is empty", async () => {
    process.env.GOOGLE_CLIENT_SECRET = "";

    await expect(import("@/lib/auth")).rejects.toThrow(
      "Missing required environment variable: GOOGLE_CLIENT_SECRET",
    );
  });
});