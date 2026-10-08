import { describe, expect, it } from "vitest";

import type { Role } from "@/app/generated/prisma/client";
import { apiError, authorizationErrorResponse, type ApiErrorBody } from "@/lib/api";
import { authorize, refuse, type AuthorizedUser } from "@/lib/authorization";

/**
 * Pure authorization tests.
 *
 * `lib/authorization.ts` must stay free of any database import so the role
 * ladder can be exhaustively tested here without PostgreSQL. The suite asserts
 * the complete 3x3 matrix rather than sampling it, because the ladder is the
 * whole security contract and a silent gap in it is exactly the kind of bug a
 * sampled test misses.
 */

const ROLES: readonly Role[] = ["STUDENT", "CONTENT_EDITOR", "ADMIN"];

const USER: AuthorizedUser = {
  id: "1f0d8a4e-6c2b-4b7e-9a1c-2d3e4f5a6b7c",
  email: "learner@example.test",
  role: "STUDENT",
};

/** [actual role on the row, role required by the guard, expected outcome]. */
const ROLE_MATRIX: readonly (readonly [Role, Role, boolean])[] = [
  ["STUDENT", "STUDENT", true],
  ["STUDENT", "CONTENT_EDITOR", false],
  ["STUDENT", "ADMIN", false],
  ["CONTENT_EDITOR", "STUDENT", true],
  ["CONTENT_EDITOR", "CONTENT_EDITOR", true],
  ["CONTENT_EDITOR", "ADMIN", false],
  ["ADMIN", "STUDENT", true],
  ["ADMIN", "CONTENT_EDITOR", true],
  ["ADMIN", "ADMIN", true],
];

/** Reads a `Response` body without an unchecked assertion. */
async function readBody(response: Response): Promise<ApiErrorBody> {
  const body: ApiErrorBody = await response.json();
  return body;
}

describe("authorize", () => {
  it.each(ROLE_MATRIX)(
    "role %s against required %s is allowed=%s",
    (actual, required, allowed) => {
      const result = authorize({ ...USER, role: actual }, required);

      expect(result.ok).toBe(allowed);
    },
  );

  it("covers the complete cross product of roles", () => {
    const expected = ROLES.flatMap((required) =>
      ROLES.map((actual) => `${actual}:${required}`),
    );
    const covered = ROLE_MATRIX.map(([actual, required]) => `${actual}:${required}`);

    // Guards the matrix above: dropping a row would silently reduce coverage.
    expect([...covered].sort()).toEqual([...expected].sort());
  });

  it("returns the exact identity it decided about", () => {
    const user: AuthorizedUser = { ...USER, role: "ADMIN" };

    const result = authorize(user, "CONTENT_EDITOR");

    if (!result.ok) {
      throw new Error("expected an ADMIN to satisfy a CONTENT_EDITOR requirement");
    }
    expect(result.user).toBe(user);
  });

  it("names the required and actual role when refusing", () => {
    const result = authorize({ ...USER, role: "CONTENT_EDITOR" }, "ADMIN");

    if (result.ok) {
      throw new Error("expected a CONTENT_EDITOR to be refused an ADMIN requirement");
    }
    expect(result.failure).toEqual({
      reason: "forbidden",
      required: "ADMIN",
      actual: "CONTENT_EDITOR",
    });
  });

  it("refuses every role against a requirement above it", () => {
    const refused = ROLE_MATRIX.filter(([, , allowed]) => !allowed);

    // STUDENT is the lowest role, so nothing is ever refused it.
    expect(refused).toHaveLength(3);
  });
});

describe("refuse", () => {
  it("reports a missing session as unauthenticated", () => {
    expect(refuse("unauthenticated")).toEqual({
      ok: false,
      failure: { reason: "unauthenticated" },
    });
  });

  it("reports a vanished account as unknown_user", () => {
    expect(refuse("unknown_user")).toEqual({
      ok: false,
      failure: { reason: "unknown_user" },
    });
  });
});

describe("authorizationErrorResponse", () => {
  it("answers a missing session with 401", async () => {
    const response = authorizationErrorResponse({ reason: "unauthenticated" });

    expect(response.status).toBe(401);
    expect(await readBody(response)).toEqual({
      error: { code: "unauthenticated", message: "Sign in to continue." },
    });
  });

  it("answers a deleted account exactly as it answers an anonymous caller", async () => {
    // Identical responses are deliberate: a distinct body would turn this
    // endpoint into an account-enumeration oracle.
    const anonymous = authorizationErrorResponse({ reason: "unauthenticated" });
    const deleted = authorizationErrorResponse({ reason: "unknown_user" });

    expect(deleted.status).toBe(anonymous.status);
    expect(await readBody(deleted)).toEqual(await readBody(anonymous));
  });

  it("answers an under-privileged account with 403", async () => {
    const response = authorizationErrorResponse({
      reason: "forbidden",
      required: "ADMIN",
      actual: "STUDENT",
    });

    expect(response.status).toBe(403);
    expect(await readBody(response)).toEqual({
      error: { code: "forbidden", message: "You do not have permission to perform this action." },
    });
  });
});

describe("apiError", () => {
  it("builds a body from a status, code, and message", async () => {
    const response = apiError(404, "not_found", "No such user.");

    expect(response.status).toBe(404);
    expect(await readBody(response)).toEqual({
      error: { code: "not_found", message: "No such user." },
    });
  });
});
