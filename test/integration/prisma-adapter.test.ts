import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
} from "next-auth/adapters";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Drives the real Auth.js v4 Prisma adapter against a migrated PostgreSQL
 * database. This is the durable replacement for the temporary route used to
 * verify adapter persistence manually; that harness was deleted and could not
 * run in CI.
 *
 * Point `TEST_DATABASE_URL` at a **dedicated test database**, never at the
 * development or production `DATABASE_URL`. The suite writes rows and removes
 * them again, but it must never share a database with real users.
 *
 * The suite is skipped when `TEST_DATABASE_URL` is absent. A skip is not a
 * pass: CI must provide the variable for these assertions to count as run.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const USER_ID = "6f1b1b8e-0a2c-4d5e-9f10-2b3c4d5e6f70";
const EMAIL = "adapter-suite@example.test";
const PROVIDER_ACCOUNT_ID = "google-adapter-suite-6f1b1b8e";
const SESSION_TOKEN = "adapter-suite-session-token";

describe.skipIf(testDatabaseUrl === undefined)("Prisma adapter persistence", () => {
  let prisma: PrismaClient;

  let createUser: NonNullable<Adapter["createUser"]>;
  let linkAccount: NonNullable<Adapter["linkAccount"]>;
  let createSession: NonNullable<Adapter["createSession"]>;
  let getSessionAndUser: NonNullable<Adapter["getSessionAndUser"]>;
  let deleteUser: NonNullable<Adapter["deleteUser"]>;

  let createdUser: AdapterUser;

  beforeAll(() => {
    if (testDatabaseUrl === undefined) {
      throw new Error("TEST_DATABASE_URL must be set to run the adapter suite");
    }

    // `lib/auth.ts` fails fast when the Google credentials are missing, and the
    // session-callback test imports it to exercise the projection. Placeholders
    // are enough because this suite never performs an OAuth exchange.
    vi.stubEnv("GOOGLE_CLIENT_ID", "adapter-suite@example.test");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "adapter-suite-secret");

    // `lib/auth.ts` transitively imports `@/lib/db`, which fails fast without
    // `DATABASE_URL`. Pointing it at the throwaway database keeps this suite
    // runnable from `TEST_DATABASE_URL` alone, and — more importantly — makes it
    // impossible for the imported singleton to open a connection to the
    // development database.
    vi.stubEnv("DATABASE_URL", testDatabaseUrl);

    // A dedicated client is built here rather than reusing `@/lib/db`, so the
    // suite can never accidentally fall back to the development connection.
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
    });

    // `Adapter` types every method as optional, so these five are narrowed once
    // here instead of being asserted non-null at each call site, which
    // AGENTS.md forbids.
    const adapter = PrismaAdapter(prisma);
    if (
      adapter.createUser === undefined ||
      adapter.linkAccount === undefined ||
      adapter.createSession === undefined ||
      adapter.getSessionAndUser === undefined ||
      adapter.deleteUser === undefined
    ) {
      throw new Error("PrismaAdapter must implement every method this suite exercises");
    }

    createUser = adapter.createUser.bind(adapter);
    linkAccount = adapter.linkAccount.bind(adapter);
    createSession = adapter.createSession.bind(adapter);
    getSessionAndUser = adapter.getSessionAndUser.bind(adapter);
    deleteUser = adapter.deleteUser.bind(adapter);

    return async () => {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    };
  });

  /**
   * The adapter always links a provider account to an existing user, so the
   * user is created once up front. Tests below depend on that ordering and are
   * declared in the sequence they rely on.
   */
  beforeAll(async () => {
    createdUser = await createUser({
      id: USER_ID,
      email: EMAIL,
      emailVerified: null,
      name: "Adapter Suite",
      image: null,
    });
  });

  afterAll(async () => {
    if (prisma === undefined) {
      return;
    }

    // Best effort: runs even when an earlier assertion failed, so a red suite
    // does not leave rows behind in the test database.
    await prisma.user.deleteMany({ where: { id: USER_ID } });
  });

  it("applies the STUDENT database default when the adapter omits a role", () => {
    expect(createdUser.id).toBe(USER_ID);
    expect(createdUser.role).toBe("STUDENT");
  });

  it("stores the user row it created", async () => {
    const stored = await prisma.user.findUnique({ where: { id: USER_ID } });

    expect(stored?.email).toBe(EMAIL);
  });

  it("links a Google account through the UUID foreign key", async () => {
    // The token fields are typed by openid-client's `TokenSetParameters`: absent
    // tokens are `undefined` rather than `null`, and `token_type` is
    // lowercase-constrained. Prisma omits an `undefined` key, so the nullable
    // columns still fall back to their NULL default.
    const linkedAccount = await linkAccount({
      userId: USER_ID,
      type: "oauth",
      provider: "google",
      providerAccountId: PROVIDER_ACCOUNT_ID,
      refresh_token: undefined,
      access_token: "adapter-suite-access-token",
      expires_at: 1893456000,
      token_type: "bearer",
      scope: "openid email profile",
      id_token: "adapter-suite-id-token",
      session_state: undefined,
    });

    // The unioned return type is `void | AdapterAccount | null | undefined`.
    // Narrowing rather than annotating makes a silent `void` return fail here
    // instead of being accepted by a type the adapter does not honour.
    if (typeof linkedAccount === "undefined" || linkedAccount === null) {
      throw new Error("expected linkAccount to return the persisted account");
    }

    expect(linkedAccount.provider).toBe("google");
    expect(linkedAccount.providerAccountId).toBe(PROVIDER_ACCOUNT_ID);
    expect(linkedAccount.userId).toBe(USER_ID);

    const linked = await prisma.account.findFirst({
      where: { userId: USER_ID },
    });

    expect(linked?.providerAccountId).toBe(PROVIDER_ACCOUNT_ID);
  });

  it("creates a database session and reads it back with its user", async () => {
    const created = await createSession({
      sessionToken: SESSION_TOKEN,
      userId: USER_ID,
      expires: new Date(Date.now() + 86_400_000),
    });

    expect(created.userId).toBe(USER_ID);

    const loaded = await getSessionAndUser(SESSION_TOKEN);
    if (loaded === null) {
      throw new Error("expected the freshly created session to load");
    }

    const session: AdapterSession = loaded.session;
    expect(session.userId).toBe(USER_ID);
    expect(loaded.user.id).toBe(USER_ID);
  });

  it("returns the authoritative stored role rather than a default", async () => {
    // Promotion happens directly in the database: the point is to prove the
    // adapter reads the stored role instead of a value baked into the adapter.
    await prisma.user.update({
      where: { id: USER_ID },
      data: { role: "ADMIN" },
    });

    const loaded = await getSessionAndUser(SESSION_TOKEN);
    if (loaded === null) {
      throw new Error("expected the session to load after promotion");
    }

    expect(loaded.user.role).toBe("ADMIN");
  });

  it("projects the adapter-loaded identity onto the session via the session callback", async () => {
    const { attachIdentityToSession } = await import("@/lib/auth");

    const loaded = await getSessionAndUser(SESSION_TOKEN);
    if (loaded === undefined || loaded === null) {
      throw new Error("expected the session to load for the callback projection");
    }

    const session = attachIdentityToSession({
      session: {
        user: { id: "", role: "STUDENT" },
        expires: loaded.session.expires.toISOString(),
      },
      user: loaded.user,
    });

    expect(session.user.id).toBe(USER_ID);
    expect(session.user.role).toBe("ADMIN");
  });

  it("removes the user and cascades to the account and session rows", async () => {
    await deleteUser(USER_ID);

    const [users, accounts, sessions] = await Promise.all([
      prisma.user.count({ where: { id: USER_ID } }),
      prisma.account.count({ where: { userId: USER_ID } }),
      prisma.session.count({ where: { userId: USER_ID } }),
    ]);

    expect({ users, accounts, sessions }).toEqual({
      users: 0,
      accounts: 0,
      sessions: 0,
    });
  });
});