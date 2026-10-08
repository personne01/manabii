import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { requireUser } from "@/lib/authorization.server";

/**
 * Who is looking at a learner page.
 *
 * `userId: null` means "anonymous", not "refused". The curriculum reads accept a
 * null user and report every lesson as not started, which is what makes a
 * signed-out preview possible with the same query the dashboard uses.
 */
export interface LearnerIdentity {
  readonly userId: string | null;
  readonly email: string | null;
}

const ANONYMOUS: LearnerIdentity = { userId: null, email: null };

/**
 * Resolves the session to the id that learner reads may be keyed on.
 *
 * A refusal collapses to the anonymous identity rather than throwing, and
 * deliberately does not distinguish "no session" from "session with no user row":
 * `lib/api.ts` already answers those identically, so the page must not reintroduce
 * the enumeration difference. Only mutations such as `submitAnswer` insist on a
 * real id, and they run that check themselves against PostgreSQL.
 */
export async function resolveLearner(): Promise<LearnerIdentity> {
  const session = await getServerSession(authOptions);
  if (session === null) {
    return ANONYMOUS;
  }

  const authorized = await requireUser(session);
  if (!authorized.ok) {
    return ANONYMOUS;
  }

  return { userId: authorized.user.id, email: authorized.user.email };
}