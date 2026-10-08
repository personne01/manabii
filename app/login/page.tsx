import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/sign-in-button";
import { DEFAULT_COURSE_SLUG } from "@/features/learning/course-slug";
import { describeAuthError } from "@/lib/auth-error";
import { resolveLearner } from "@/lib/learner.server";

/**
 * Sign-in page.
 *
 * A Server Component: it resolves the session so an already-authenticated learner
 * never sees the login form, and hands off the interactive part to
 * `GoogleSignInButton`. Redirecting here rather than in middleware keeps this slice
 * to one authorization primitive rather than introducing a matcher that would
 * need its own handling for unpublished routes.
 *
 * Auth.js appends `?error=<code>` when an OAuth round trip fails. The code is
 * turned into fixed copy by `describeAuthError` and rendered as an alert above
 * the button; unknown codes render nothing, so the query string is never echoed
 * back to the page.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const authErrorMessage = describeAuthError((await searchParams).error);

  const learner = await resolveLearner();
  if (learner.userId !== null) {
    redirect("/learn");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/brand/manabii-mark.svg"
          alt=""
          width={64}
          height={80}
          unoptimized
          priority
        />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">Manabii</h1>
        <p className="mt-2 text-ink/70">
          Every day, a little more Japanese.
        </p>
      </div>

      <div className="mt-10 rounded-xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Sign in to start learning</h2>
        <p className="mt-1 text-sm text-ink/70">
          Your progress, lesson scores, and streaks are tied to your account, so they
          follow you across devices.
        </p>

        <div className="mt-6">
          {authErrorMessage !== null ? (
            <p
              role="alert"
              className="mb-3 rounded-md border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-ink"
            >
              {authErrorMessage}
            </p>
          ) : null}
          <GoogleSignInButton callbackUrl={`/learn`} />
        </div>

        <p className="mt-4 text-xs text-ink/50">
          Manabii signs you in with Google only. No password is ever stored.
        </p>
      </div>

      <nav className="mt-8 text-center">
        <Link
          href="/learn"
          className="text-sm text-ink/70 underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Preview the {DEFAULT_COURSE_SLUG === "jlpt-n5" ? "JLPT N5" : DEFAULT_COURSE_SLUG}{" "}
          lessons without signing in
        </Link>
      </nav>
    </main>
  );
}