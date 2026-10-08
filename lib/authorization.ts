import type { Role } from "@/app/generated/prisma/client";

/**
 * Server-side permission rules, deliberately free of any database import.
 *
 * AGENTS.md section 4 requires business logic to stay separate from database
 * access. Keeping the ladder and the decision function here means the rules that
 * matter most for security can be unit-tested exhaustively without a database,
 * without environment variables, and without a running Next.js request.
 *
 * Nothing in this module may be imported by client components. It exists only to
 * answer "may this identity perform this operation", never to decide who the
 * identity is; that half is `requireUser` in `@/lib/authorization.server`.
 */

/**
 * Ranked privilege ladder. A role satisfies a requirement when its rank is at
 * least the required rank, so ADMIN satisfies a CONTENT_EDITOR requirement.
 *
 * Assumption, recorded as AGENTS.md section 23 requires for low-risk
 * ambiguities: administrators are a strict superset of content editors, because
 * an administrator manages content by definition. The ladder is one frozen
 * record rather than a comparison function so that adding a role later forces an
 * explicit decision about where it belongs instead of failing silently at
 * runtime.
 */
const ROLE_RANK: Readonly<Record<Role, number>> = {
  STUDENT: 0,
  CONTENT_EDITOR: 1,
  ADMIN: 2,
};

/**
 * The identity a permission decision is made about, as read from PostgreSQL.
 * Deliberately narrow: only the fields a route is allowed to see or echo back.
 */
export interface AuthorizedUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
}

/**
 * Why an authorization attempt was refused.
 *
 * `unauthenticated` and `unknown_user` are separate reasons because they are
 * genuinely different states for the caller to handle, yet they must produce
 * byte-identical responses (see `authorizationErrorResponse`) so the API never
 * reveals that a session referenced a deleted account.
 */
export type AuthorizationFailure =
  | { readonly reason: "unauthenticated" }
  | { readonly reason: "unknown_user" }
  | { readonly reason: "forbidden"; readonly required: Role; readonly actual: Role };

/**
 * A decision plus either the identity it was made about or the reason it was
 * refused. Modelled as a discriminated union rather than a thrown error so that
 * a route cannot accidentally treat "refused" as "succeeded": forgetting to
 * check `ok` is a type error, not a silent authorization bypass.
 */
export type AuthorizationResult =
  | { readonly ok: true; readonly user: AuthorizedUser }
  | { readonly ok: false; readonly failure: AuthorizationFailure };

/**
 * Builds a refusal that is not a permission failure, i.e. one that happens
 * before an identity has been established.
 */
export function refuse(
  reason: Extract<AuthorizationFailure["reason"], "unauthenticated" | "unknown_user">,
): AuthorizationResult {
  return { ok: false, failure: { reason } };
}

/**
 * Decides whether an already-identified user satisfies a required role.
 *
 * Takes the role as an argument rather than reading it from anywhere, so the
 * decision is a pure function of its inputs and a caller cannot smuggle in an
 * unverified value: `requireUser` is the only thing that constructs
 * `AuthorizedUser`, and it constructs it from the database.
 */
export function authorize(user: AuthorizedUser, requiredRole: Role): AuthorizationResult {
  if (ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) {
    return {
      ok: false,
      failure: { reason: "forbidden", required: requiredRole, actual: user.role },
    };
  }

  return { ok: true, user };
}
