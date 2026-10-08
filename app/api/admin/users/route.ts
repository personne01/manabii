import { getServerSession } from "next-auth";

import { authorizationErrorResponse } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { requireUser } from "@/lib/authorization.server";
import { db } from "@/lib/db";

/**
 * Administrative user listing, gated on the ADMIN role.
 *
 * Included as the second consumer of the authorization gate so the slice proves
 * both halves of the rule: that an anonymous or under-privileged caller is
 * refused, and that a permitted one is not. Email addresses are personal records
 * under AGENTS.md section 14, so the gate is the only thing standing between this
 * endpoint and a directory of every user in the system.
 */
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions);

  const result = await requireUser(session, "ADMIN");
  if (!result.ok) {
    return authorizationErrorResponse(result.failure);
  }

  // AGENTS.md section 7 forbids unbounded queries, so the listing is capped.
  // Cursor pagination is deliberately deferred: the cap is what prevents an
  // accidental full-table scan, and it must be replaced with real pagination
  // before this endpoint is exposed to end users.
  const users = await db.user.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 100,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return Response.json({ users });
}
