"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary for `/learn`.
 *
 * A Client Component because Next.js requires `error.tsx` to expose `reset`.
 * `reset` re-renders the segment rather than reloading the page, which is the
 * right recovery for a failed database read: the request is retried without
 * discarding where the learner was.
 *
 * `error.digest` is the only safe thing to surface from a production error. The
 * thrown value itself is deliberately not rendered — a raw exception can carry
 * query fragments or learner data, and AGENTS.md section 19 forbids leaking
 * internal failures.
 */
export default function LearnError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // No learner content here, only the digest, so a log sink cannot record
    // anything the learner typed.
    console.error("/learn failed", { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        We could not load this page
      </h1>
      <p className="mt-3 text-ink/70">
        Something went wrong on our side. Your progress is safe — nothing was
        changed.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Try again
      </button>

      {error.digest === undefined ? null : (
        <p className="mt-6 text-xs text-ink/50">
          Reference: <code>{error.digest}</code>
        </p>
      )}
    </main>
  );
}