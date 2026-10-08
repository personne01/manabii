import { getServerSession } from "next-auth";

import { authorizationErrorResponse } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { requireUser } from "@/lib/authorization.server";

/**
 * Returns the caller's own identity as PostgreSQL currently stores it.
 *
 * This route exists to make the authorization slice a real vertical cut rather
 * than an unused library: it is the smallest endpoint that must never answer for
 * somebody else. It reports the role re-read from the database, so a client that
 * cached an older session value sees the change on its next request.
 */
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions);

  const result = await requireUser(session);
  if (!result.ok) {
    return authorizationErrorResponse(result.failure);
  }

  return Response.json({ user: result.user });
}
