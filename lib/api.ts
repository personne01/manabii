import type { AuthorizationFailure } from "@/lib/authorization";

/**
 * Shared HTTP response conventions for the API routes, per AGENTS.md section 11
 * ("maintain consistent API response conventions") and section 19 ("use
 * consistent error structures", "return appropriate HTTP status codes").
 *
 * Errors are always returned as a body, never thrown, so a client always parses
 * the same envelope. Raw exceptions are never forwarded: an unexpected failure is
 * a 500 with a generic message, and the detail belongs in the server log where
 * it cannot leak table names, queries, or stack traces to a caller.
 */
export interface ApiErrorBody {
  readonly error: {
    /** Stable, machine-readable discriminator such as "unauthenticated". */
    readonly code: string;
    /** Safe for display to an end user. Never contains internal detail. */
    readonly message: string;
  };
}

/**
 * Builds a JSON error response with the shared envelope.
 *
 * @param status HTTP status code.
 * @param code Stable machine-readable discriminator.
 * @param message Human-readable, safe-to-display explanation.
 */
export function apiError(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };

  return Response.json(body, { status });
}

/**
 * Maps an authorization failure to its HTTP response.
 *
 * The switch is exhaustive over the union and has no default branch, so adding a
 * new `AuthorizationFailure` reason becomes a compile error here instead of a
 * route that silently answers 200 to a refused request.
 *
 * `unknown_user` deliberately produces the same status, code, and message as
 * `unauthenticated`. Answering it differently would let any caller holding a
 * stale cookie probe whether an account exists, which is account enumeration.
 */
export function authorizationErrorResponse(failure: AuthorizationFailure): Response {
  switch (failure.reason) {
    case "unauthenticated":
    case "unknown_user":
      return apiError(401, "unauthenticated", "Sign in to continue.");
    case "forbidden":
      return apiError(403, "forbidden", "You do not have permission to perform this action.");
  }
}
