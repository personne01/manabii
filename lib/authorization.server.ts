import type { Session } from "next-auth";

import type { Role } from "@/app/generated/prisma/client";
import { authorize, refuse, type AuthorizationResult } from "@/lib/authorization";
import { db } from "@/lib/db";

/**
 * Server-side authorization gate. This is the only place in the codebase allowed
 * to turn a session into an identity that a permission decision may rely on.
 *
 * AGENTS.md section 8 requires that authorization is enforced on the server and
 * that roles are never trusted from the client. The session role is deliberately
 * ignored here even though it is convenient: it is stamped onto the session for
 * rendering, and any cached copy of it can be stale the moment an administrator
 * demotes a user. The role is therefore re-read from PostgreSQL on every call.
 *
 * The module is named `.server` because it opens a database connection. It must
 * not be imported from a client component, where the import would pull the
 * connection pool into the browser bundle.
 */

/**
 * Resolves the session to an identity and checks it against `requiredRole`.
 *
 * Defaults to the lowest role so that the common case (any signed-in user) needs
 * no argument, while an explicit requirement must be spelled out by the caller.
 *
 * @param session Session from `getServerSession`, or `null` when nobody is
 *   signed in.
 * @param requiredRole Lowest role permitted to proceed.
 */
export async function requireUser(
  session: Session | null,
  requiredRole: Role = "STUDENT",
): Promise<AuthorizationResult> {
  if (session === null) {
    return refuse("unauthenticated");
  }

  // An empty id cannot match a user row, and treating it as unauthenticated is
  // safer than passing "" to a UUID lookup. Checked explicitly so a malformed
  // session fails as an authentication failure rather than a database error.
  const userId = session.user.id;
  if (userId === "") {
    return refuse("unauthenticated");
  }

  // Only the three fields an authorized route may use are selected, so a role or
  // email added to `User` later cannot leak into responses by accident.
  const stored = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (stored === null) {
    // The session outlived the account it points at, which happens when a user
    // is deleted mid-session and cascades remove the session row one request
    // later. Reported distinctly from `unauthenticated` so the response can be
    // identical to it.
    return refuse("unknown_user");
  }

  return authorize({ id: stored.id, email: stored.email, role: stored.role }, requiredRole);
}
