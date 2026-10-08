import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@/app/generated/prisma/client";
import type { ApiErrorBody } from "@/lib/api";
import type { AuthorizedUser } from "@/lib/authorization";

/**
 * Drives the server-side authorization guard and the routes that use it against
 * a real migrated PostgreSQL database.
 *
 * The subject is PostgreSQL, not the session. Every assertion below sets a
 * session role that disagrees with the stored row on purpose, because the whole
 * point of the guard is that the stored row wins. A guard written against
 * `session.user.role` would pass a naive test and fail these ones.
 *
 * Point `TEST_DATABASE_URL` at a **dedicated throwaway database**, never at the
 * development or production `DATABASE_URL`. The suite writes rows and removes
 * them again, but it must never share a database with real users.
 *
 * The suite is skipped when `TEST_DATABASE_URL` is absent. A skip is not a
 * pass: CI must provide the variable for these assertions to count as run.
 */
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];

const { getServerSessionMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn<() => Promise<Session | null>>(),
}));

/**
 * `lib/auth.ts` imports next-auth for types only, so replacing the module with a
 * single session getter leaves `authOptions` intact while making the session
 * deterministic. Mocking the database instead would make the test assert its own
 * fixture rather than the guard.
 */
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));

const STUDENT_ID = "0190f1c2-0001-7a5b-8c9d-0e1f2a3b4c01";
const EDITOR_ID = "0190f1c2-0002-7a5b-8c9d-0e1f2a3b4c02";
const ADMIN_ID = "0190f1c2-0003-7a5b-8c9d-0e1f2a3b4c03";
const DELETED_ID = "0190f1c2-0004-7a5b-8c9d-0e1f2a3b4c04";

const STUDENT_EMAIL = "student@authorization-suite.test";
const EDITOR_EMAIL = "editor@authorization-suite.test";
const ADMIN_EMAIL = "admin@authorization-suite.test";

const SUITE_IDS: readonly string[] = [STUDENT_ID, EDITOR_ID, ADMIN_ID, DELETED_ID];

const UNAUTHENTICATED_BODY: ApiErrorBody = {
  error: { code: "unauthenticated", message: "Sign in to continue." },
};
const FORBIDDEN_BODY: ApiErrorBody = {
  error: { code: "forbidden", message: "You do not have permission to perform this action." },
};

function requireTestDatabaseUrl(): string {
  if (testDatabaseUrl === undefined || testDatabaseUrl === "") {
    throw new Error("TEST_DATABASE_URL must be set to run the authorization suite");
  }

  if (testDatabaseUrl.includes("schema=public")) {
    throw new Error("TEST_DATABASE_URL must not include ?schema=public");
  }

  // Defence in depth. The URL is handed to node-postgres verbatim, so the
  // database name is the only signal separating a throwaway from a real
  // database. Without this a mistyped variable would silently wipe real rows.
  if (!testDatabaseUrl.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point at a database whose name ends in _test");
  }

  return testDatabaseUrl;
}

/** Builds the session an attacker could otherwise dictate. */
function forgedSession(id: string, role: Role): Session {
  return {
    user: { id, role },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

async function readBody(response: Response): Promise<ApiErrorBody> {
  const body: ApiErrorBody = await response.json();
  return body;
}

describe.skipIf(testDatabaseUrl === undefined)("server-side authorization", () => {
  const originalEnvironment = {
    DATABASE_URL: process.env["DATABASE_URL"],
    GOOGLE_CLIENT_ID: process.env["GOOGLE_CLIENT_ID"],
    GOOGLE_CLIENT_SECRET: process.env["GOOGLE_CLIENT_SECRET"],
  };

  let prisma: typeof import("@/lib/db").db;
  let requireUser: typeof import("@/lib/authorization.server").requireUser;
  let getMe: typeof import("@/app/api/me/route").GET;
  let listAdminUsers: typeof import("@/app/api/admin/users/route").GET;
  let clientReady = false;

  beforeAll(async () => {
    process.env["DATABASE_URL"] = requireTestDatabaseUrl();

    // `lib/auth.ts` refuses to build `authOptions` without Google credentials and
    // both routes import it. Placeholders suffice: no OAuth exchange happens here.
    process.env["GOOGLE_CLIENT_ID"] ??= "authorization-suite@example.test";
    process.env["GOOGLE_CLIENT_SECRET"] ??= "authorization-suite-secret";

    // `@/lib/db` reads DATABASE_URL when the module is first evaluated and caches
    // the client on globalThis, so both have to be cleared before the modules
    // under test are imported. Without this the guard would query the development
    // database instead of the throwaway one.
    Reflect.deleteProperty(globalThis, "prisma");
    vi.resetModules();

    ({ db: prisma } = await import("@/lib/db"));
    ({ requireUser } = await import("@/lib/authorization.server"));
    ({ GET: getMe } = await import("@/app/api/me/route"));
    ({ GET: listAdminUsers } = await import("@/app/api/admin/users/route"));
    clientReady = true;

    await prisma.user.createMany({
      data: [
        { id: STUDENT_ID, email: STUDENT_EMAIL, name: "Suite Student", role: "STUDENT" },
        {
          id: EDITOR_ID,
          email: EDITOR_EMAIL,
          name: "Suite Editor",
          role: "CONTENT_EDITOR",
        },
        { id: ADMIN_ID, email: ADMIN_EMAIL, name: "Suite Admin", role: "ADMIN" },
      ],
    });
  });

  afterAll(async () => {
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = value;
      }
    }

    // `beforeAll` can fail before the client exists — a rejected
    // TEST_DATABASE_URL is the common case. Cleanup would then throw a TypeError
    // that hides the real reason the suite never started.
    if (!clientReady) {
      return;
    }

    // Best effort: runs even when an earlier assertion failed, so a red suite
    // does not leave rows behind in the test database.
    await prisma.user.deleteMany({ where: { id: { in: [...SUITE_IDS] } } });
    expect(await prisma.user.count({ where: { id: { in: [...SUITE_IDS] } } })).toBe(0);

    await prisma.$disconnect();
    Reflect.deleteProperty(globalThis, "prisma");
  });

  beforeEach(() => {
    getServerSessionMock.mockReset();
  });

  describe("requireUser", () => {
    it("refuses a missing session", async () => {
      expect(await requireUser(null)).toEqual({
        ok: false,
        failure: { reason: "unauthenticated" },
      });
    });

    it("refuses a session that carries no user id, however privileged it claims to be", async () => {
      // An empty id must never reach the database: it would turn a lookup key
      // into a query the caller controls.
      expect(await requireUser(forgedSession("", "ADMIN"))).toEqual({
        ok: false,
        failure: { reason: "unauthenticated" },
      });
    });

    it("reports a deleted account as unknown", async () => {
      await prisma.user.create({
        data: { id: DELETED_ID, email: "deleted@authorization-suite.test" },
      });
      await prisma.user.delete({ where: { id: DELETED_ID } });

      expect(await requireUser(forgedSession(DELETED_ID, "ADMIN"))).toEqual({
        ok: false,
        failure: { reason: "unknown_user" },
      });
    });

    it("refuses a session whose claimed ADMIN role is not in the database", async () => {
      // The row is a STUDENT. Trusting the session here would grant admin access.
      expect(await requireUser(forgedSession(STUDENT_ID, "ADMIN"), "ADMIN")).toEqual({
        ok: false,
        failure: { reason: "forbidden", required: "ADMIN", actual: "STUDENT" },
      });
    });

    it("grants access a session under-claims, using the stored role", async () => {
      // The mirror image of the test above: a demoted session must not become a
      // privilege escalation just because the cached role is stale.
      const result = await requireUser(forgedSession(ADMIN_ID, "STUDENT"), "ADMIN");

      if (!result.ok) {
        throw new Error("expected the stored ADMIN role to authorize the request");
      }
      expect(result.user.role).toBe("ADMIN");
      expect(result.user.email).toBe(ADMIN_EMAIL);
    });

    it("defaults to the STUDENT requirement", async () => {
      const result = await requireUser(forgedSession(STUDENT_ID, "STUDENT"));

      if (!result.ok) {
        throw new Error("expected a signed-in student to satisfy the default requirement");
      }
      expect(result.user.id).toBe(STUDENT_ID);
    });

    it("lets a higher role satisfy a lower requirement", async () => {
      const result = await requireUser(forgedSession(ADMIN_ID, "ADMIN"), "CONTENT_EDITOR");

      if (!result.ok) {
        throw new Error("expected an ADMIN to satisfy a CONTENT_EDITOR requirement");
      }
      expect(result.user.role).toBe("ADMIN");
    });

    it("refuses an editor from an administrative requirement", async () => {
      expect(await requireUser(forgedSession(EDITOR_ID, "CONTENT_EDITOR"), "ADMIN")).toEqual({
        ok: false,
        failure: { reason: "forbidden", required: "ADMIN", actual: "CONTENT_EDITOR" },
      });
    });
  });

  describe("GET /api/me", () => {
    it("answers an anonymous caller with 401", async () => {
      getServerSessionMock.mockResolvedValue(null);

      const response = await getMe();

      expect(response.status).toBe(401);
      expect(await readBody(response)).toEqual(UNAUTHENTICATED_BODY);
    });

    it("returns the stored identity rather than the session's", async () => {
      getServerSessionMock.mockResolvedValue(forgedSession(EDITOR_ID, "STUDENT"));

      const response = await getMe();

      expect(response.status).toBe(200);
      const body: { user: AuthorizedUser } = await response.json();
      expect(body.user).toEqual({
        id: EDITOR_ID,
        email: EDITOR_EMAIL,
        role: "CONTENT_EDITOR",
      });
    });
  });

  describe("GET /api/admin/users", () => {
    it("answers an anonymous caller with 401", async () => {
      getServerSessionMock.mockResolvedValue(null);

      const response = await listAdminUsers();

      expect(response.status).toBe(401);
      expect(await readBody(response)).toEqual(UNAUTHENTICATED_BODY);
    });

    it("refuses a student with 403", async () => {
      getServerSessionMock.mockResolvedValue(forgedSession(STUDENT_ID, "STUDENT"));

      const response = await listAdminUsers();

      expect(response.status).toBe(403);
      expect(await readBody(response)).toEqual(FORBIDDEN_BODY);
    });

    it("refuses an editor with 403", async () => {
      getServerSessionMock.mockResolvedValue(forgedSession(EDITOR_ID, "CONTENT_EDITOR"));

      const response = await listAdminUsers();

      expect(response.status).toBe(403);
      expect(await readBody(response)).toEqual(FORBIDDEN_BODY);
    });

    it("refuses a student whose session claims ADMIN", async () => {
      // The escalation attempt the whole slice exists to stop.
      getServerSessionMock.mockResolvedValue(forgedSession(STUDENT_ID, "ADMIN"));

      const response = await listAdminUsers();

      expect(response.status).toBe(403);
      expect(await readBody(response)).toEqual(FORBIDDEN_BODY);
    });

    it("lists the users in a stable order for an admin", async () => {
      getServerSessionMock.mockResolvedValue(forgedSession(ADMIN_ID, "ADMIN"));

      const response = await listAdminUsers();

      expect(response.status).toBe(200);
      const body: { users: { id: string; role: Role }[] } = await response.json();
      expect(body.users.map((user) => user.id)).toEqual([STUDENT_ID, EDITOR_ID, ADMIN_ID]);
      expect(body.users.map((user) => user.role)).toEqual([
        "STUDENT",
        "CONTENT_EDITOR",
        "ADMIN",
      ]);
    });
  });
});
