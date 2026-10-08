import { describe, expect, it } from "vitest";

import { describeAuthError } from "@/lib/auth-error";

/**
 * `describeAuthError` sits between an untrusted query string and the DOM, so
 * these tests pin both halves of its contract: known Auth.js codes must map to
 * stable learner-facing copy, and anything unrecognized must fall through to
 * `null` rather than being echoed back into the page.
 */
describe("describeAuthError", () => {
  it("maps every code next-auth redirects to pages.signIn", () => {
    const redirectCodes = [
      "Signin",
      "OAuthSignin",
      "OAuthCallback",
      "OAuthCreateAccount",
      "EmailCreateAccount",
      "Callback",
      "OAuthAccountNotLinked",
      "EmailSignin",
      "CredentialsSignin",
      "SessionRequired",
    ];

    for (const code of redirectCodes) {
      const message = describeAuthError(code);
      expect(message, `expected a message for ${code}`).toEqual(
        expect.any(String),
      );
      expect(message === null || message.length > 0).toBe(true);
    }
  });

  it("maps the redirect codes next-auth renders on its own error page today", () => {
    for (const code of ["AccessDenied", "Verification", "Configuration"]) {
      const message = describeAuthError(code);
      expect(message, `expected a message for ${code}`).toEqual(
        expect.any(String),
      );
    }
  });

  it("uses the pinned copy for the most common OAuth failure", () => {
    expect(describeAuthError("OAuthCallback")).toBe(
      "Google did not complete the sign-in. Please try again.",
    );
  });

  it("normalizes casing and surrounding whitespace", () => {
    expect(describeAuthError("  oauthcallback ")).toBe(
      describeAuthError("OAuthCallback"),
    );
  });

  it("returns null for the benign google error next-auth emits for direct provider visits", () => {
    expect(describeAuthError("google")).toBeNull();
  });

  it("returns null instead of echoing untrusted query values", () => {
    expect(describeAuthError('<img src=x onerror=alert(1)>')).toBeNull();
    expect(describeAuthError("https://evil.example.com")).toBeNull();
    expect(describeAuthError("")).toBeNull();
    expect(describeAuthError("   ")).toBeNull();
    expect(describeAuthError(undefined)).toBeNull();
    expect(describeAuthError(null)).toBeNull();
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(describeAuthError(["OAuthCallback", "Signin"])).toBe(
      describeAuthError("OAuthCallback"),
    );
    expect(describeAuthError(["google", "OAuthCallback"])).toBeNull();
  });
});
