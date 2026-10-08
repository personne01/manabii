"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

/**
 * Starts the Google OAuth flow.
 *
 * A Client Component because `signIn` from `next-auth/react` performs a navigation
 * the server cannot perform for the user. The button is the only part of the
 * login page that ships to the browser, so the rest of the page stays a Server
 * Component.
 *
 * The provider id is passed in rather than hardcoded here so a future second
 * provider is an explicit prop change instead of an edit inside the shared
 * component.
 *
 * The four `fill` hexes are the only hardcoded colors in the app. They are
 * Google's own logo palette, which their branding rules require verbatim, so
 * mapping them onto the Manabii design tokens would render a trademark that
 * Google is not obliged to recognize. Do not "fix" them the way section 5 asks
 * for everywhere else.
 */
export function GoogleSignInButton({
  callbackUrl = "/learn",
  label = "Continue with Google",
}: {
  readonly callbackUrl?: string;
  readonly label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState(false);

  function handleClick(): void {
    startTransition(async () => {
      setFailure(false);
      try {
        await signIn("google", { callbackUrl });
      } catch {
        // `signIn` normally navigates, so reaching here means the redirect could
        // not be started. Surfacing a retryable message beats a dead click and
        // keeps the raw failure (which can carry OAuth internals) off the screen.
        setFailure(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
        className="inline-flex min-h-11 items-center justify-center gap-3 rounded-lg bg-brand px-5 py-3 text-base font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.08 7.94-2.9l-3.87-3a7.21 7.21 0 0 1-10.74-3.79h-4v3.09A11.99 11.99 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.33 14.31a7.2 7.2 0 0 1 0-4.62v-3.1h-4a12 12 0 0 0 0 10.82l4-3.1Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.33 6.59l4 3.1A7.21 7.21 0 0 1 12 4.75Z"
          />
        </svg>
        {isPending ? "Opening Google…" : label}
      </button>

      {failure ? (
        <p role="alert" className="text-sm text-brand">
          Sign-in could not be started. Please try again.
        </p>
      ) : null}
    </div>
  );
} 