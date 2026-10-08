import Link from "next/link";
import { notFound } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/sign-in-button";
import { ProgressBadge } from "@/features/learning/components/progress-badge";
import { DEFAULT_COURSE_SLUG } from "@/features/learning/course-slug";
import { getCourseOutline } from "@/features/learning/curriculum.server";
import { resolveLearner } from "@/lib/learner.server";

/**
 * Course dashboard.
 *
 * A Server Component: progress is read from PostgreSQL here rather than fetched
 * from the browser, so the initial paint is authoritative and `submitAnswer` has
 * no read-back path to maintain.
 *
 * Anonymous visitors are served the published outline instead of a redirect. The
 * curriculum query accepts a null user and reports every lesson as not started, so
 * preview and dashboard share one query and one rendering branch; only the
 * sign-in affordance differs.
 */
export default async function LearnPage() {
  const learner = await resolveLearner();
  const outline = await getCourseOutline({
    courseSlug: DEFAULT_COURSE_SLUG,
    userId: learner.userId,
  });

  if (outline === null) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-brand">
            {outline.level}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {outline.title}
          </h1>
          <p className="mt-2 max-w-2xl text-ink/70">{outline.description}</p>
        </div>

        {learner.userId === null ? (
          <div className="shrink-0 sm:w-56">
            <GoogleSignInButton callbackUrl="/learn" label="Sign in to track progress" />
          </div>
        ) : (
          <div className="shrink-0 text-right">
            <p className="text-sm text-ink/70">
              {outline.completedLessons} of {outline.totalLessons} lessons complete
            </p>
            <p className="text-2xl font-semibold text-success">
              {outline.progressPercent}%
            </p>
          </div>
        )}
      </header>

      {learner.userId === null ? (
        <p
          role="note"
          className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink/70"
        >
          You are previewing the published lessons. Sign in to record your answers,
          scores, and completion.
        </p>
      ) : null}

      <nav aria-label="Course lessons" className="mt-10 flex flex-col gap-10">
        {outline.chapters.map((chapter) => (
          <section key={chapter.id} aria-labelledby={`chapter-${chapter.id}`}>
            <h2
              id={`chapter-${chapter.id}`}
              className="text-xl font-semibold tracking-tight text-ink"
            >
              {chapter.title}
            </h2>
            {chapter.description ? (
              <p className="mt-1 text-sm text-ink/60">{chapter.description}</p>
            ) : null}

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {chapter.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${lesson.slug}`}
                    className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-ink">{lesson.title}</span>
                      <ProgressBadge state={lesson.progressState} />
                    </div>
                    <p className="text-xs text-ink/50">
                      About {lesson.estimatedMinutes} min
                      {lesson.progressState === "completed"
                        ? ` · best score ${lesson.scorePercent}%`
                        : null}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {outline.totalLessons === 0 ? (
        <p className="mt-10 rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink/70">
          No lessons have been published for this course yet.
        </p>
      ) : null}
    </main>
  );
}