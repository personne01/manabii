/**
 * Maps Auth.js (next-auth v4) `?error=` query codes to learner-facing copy.
 *
 * A failed OAuth round trip is redirected back to `pages.signIn` (`/login`,
 * configured in `lib/auth.ts`) carrying a short, fixed error code in the query
 * string. This module turns that code into one sentence for the sign-in page
 * and is deliberately free of any Next.js, React, or session import, so the
 * whole table is unit-testable as a pure function.
 *
 * Two properties matter for security and correctness:
 *
 * - The query string is untrusted input. Only codes this table names are ever
 *   rendered; anything else (including the benign `google` value next-auth
 *   emits when the provider sign-in page is visited directly with no error)
 *   returns `null` and renders no banner, so a crafted URL can never echo
 *   arbitrary text back into the page.
 * - The copy is fixed per code. Nothing derived from the URL — no raw
 *   provider response, no free text — reaches the DOM.
 */

/**
 * Known next-auth v4 error codes, lowercased.
 *
 * The first ten are the codes next-auth itself redirects to `pages.signIn`
 * (verified against `next-auth@4.24.15`'s `core/index.js`); the last four are
 * codes next-auth renders on its own error page today but would deliver here
 * if `pages.error` were ever pointed at `/login`, so they are mapped rather
 * than left to the `null` fallback.
 */
const AUTH_ERROR_MESSAGES: Readonly<Record<string, string | undefined>> = {
  signin: "Sign-in failed. Please try again.",
  oauthsignin: "Google sign-in could not be started. Please try again.",
  oauthcallback: "Google did not complete the sign-in. Please try again.",
  oauthcreateaccount: "Your account could not be created. Please try again.",
  oauthaccountnotlinked:
    "This Google account is linked to a different sign-in method. Please sign in the way you registered.",
  callback: "Sign-in could not be completed. Please try again.",
  emailcreateaccount: "Your account could not be created. Please try again.",
  emailsignin: "We could not send the sign-in email. Please try again.",
  credentialssignin: "Sign-in failed. Please check your details and try again.",
  sessionrequired: "Please sign in to continue.",
  accessdenied: "Google did not grant access. Please try another account.",
  configuration: "Sign-in is temporarily unavailable. Please try again later.",
  verification:
    "This sign-in link is invalid or has expired. Please start sign-in again.",
  default: "Sign-in is temporarily unavailable. Please try again later.",
};

/**
 * Returns the friendly message for an Auth.js error code, or `null` when the
 * value is absent, empty, or not a recognized code.
 *
 * `error` mirrors the shape a route receives from `searchParams`
 * (`string | string[] | undefined`); when a parameter is repeated the first
 * value decides, matching how query strings are conventionally read. Input is
 * trimmed and lowercased so `OAuthCallback`, `oauthcallback`, and
 * ` oauthcallback ` are the same code.
 */
export function describeAuthError(
  error: string | string[] | undefined | null,
): string | null {
  const raw = Array.isArray(error) ? error[0] : error;
  if (raw === undefined || raw === null) {
    return null;
  }

  const code = raw.trim().toLowerCase();
  if (code === "") {
    return null;
  }

  return AUTH_ERROR_MESSAGES[code] ?? null;
}
