import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressBadge } from "@/features/learning/components/progress-badge";
import { DEFAULT_COURSE_SLUG } from "@/features/learning/course-slug";
import { getLessonForLearner } from "@/features/learning/lesson.server";
import { resolveLearner } from "@/lib/learner.server";

/**
 * Post-lesson result.
 *
 * The score shown here is the one PostgreSQL derives via `computeLessonScore`,
 * not anything the browser reported. `submitAnswer` returns `lessonCompleted` so
 * the exercise runner can react immediately, but that is a convenience hint:
 * re-reading here means a refresh, a stale tab, or a tampered client state cannot
 * change what the learner is told they scored.
 */
export default async function LessonResultPage({
  params,
}: PageProps<"/learn/[lessonSlug]/result">) {
  const { lessonSlug } = await params;
  const learner = await resolveLearner();
  const lesson = await getLessonForLearner({
    courseSlug: DEFAULT_COURSE_SLUG,
    lessonSlug,
    userId: learner.userId,
  });

  if (lesson === null) {
    notFound();
  }

  const { score } = lesson;
  const isSignedIn = learner.userId !== null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-ink/60">
        <Link
          href="/learn"
          className="underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {lesson.course.title}
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/learn/${lesson.slug}`}
          className="underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {lesson.title}
        </Link>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {lesson.title}
          </h1>
          <p className="mt-2 text-ink/70">Your result for this lesson.</p>
        </div>
        <ProgressBadge state={lesson.progressState} />
      </header>

      {isSignedIn ? (
        <section aria-labelledby="score-heading" className="mt-8">
          <h2 id="score-heading" className="sr-only">
            Score
          </h2>
          <p className="text-5xl font-semibold tracking-tight text-ink">
            {score.scorePercent}%
          </p>
          <dl className="mt-6 grid max-w-md grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-ink/50">Correct</dt>
              <dd className="text-2xl font-semibold text-success">
                {score.correctExercises}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/50">Answered</dt>
              <dd className="text-2xl font-semibold text-ink">
                {score.answeredExercises}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink/50">Total</dt>
              <dd className="text-2xl font-semibold text-ink">{score.totalExercises}</dd>
            </div>
          </dl>

          {score.completed ? (
            <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-4 text-sm text-success">
              Lesson complete. Reviewing it again will not change this score — the
              best result is kept.
            </p>
          ) : (
            <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-4 text-sm text-ink/70">
              {score.answeredExercises === 0
                ? "You have not answered any questions in this lesson yet."
                : `You answered ${score.answeredExercises} of ${score.totalExercises} questions. Answer the rest to complete the lesson.`}
            </p>
          )}
        </section>
      ) : (
        <section aria-labelledby="signed-out-heading" className="mt-8">
          <h2 id="signed-out-heading" className="text-xl font-semibold tracking-tight text-ink">
            Sign in to see your score
          </h2>
          <p className="mt-2 text-ink/70">
            Scores come from your saved answers, so they are only available to a
            signed-in learner.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Sign in
          </Link>
        </section>
      )}

      <p className="mt-10">
        <Link
          href={`/learn/${lesson.slug}`}
          className="text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Back to the lesson
        </Link>
      </p>
    </main>
  );
}