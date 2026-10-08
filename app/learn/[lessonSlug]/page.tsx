import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressBadge } from "@/features/learning/components/progress-badge";
import { ExerciseRunner } from "@/features/learning/components/exercise-runner";
import { DEFAULT_COURSE_SLUG } from "@/features/learning/course-slug";
import { getLessonForLearner } from "@/features/learning/lesson.server";
import { resolveLearner } from "@/lib/learner.server";

/**
 * One published lesson: study content, then its exercises.
 *
 * A Server Component. `getLessonForLearner` withholds `ExerciseOption.isCorrect`
 * and `Exercise.explanation`, so nothing graded can reach the browser before the
 * learner has actually answered; only the post-submission result reveals a key.
 */
export default async function LessonPage({ params }: PageProps<"/learn/[lessonSlug]">) {
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
        <span>{lesson.chapter.title}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {lesson.title}
          </h1>
          <p className="mt-2 text-ink/70">{lesson.description}</p>
          <p className="mt-3 text-sm text-ink/50">
            About {lesson.estimatedMinutes} min · {lesson.exercises.length}{" "}
            {lesson.exercises.length === 1 ? "question" : "questions"}
          </p>
        </div>
        <ProgressBadge state={lesson.progressState} />
      </header>

      {lesson.vocabulary.length > 0 ? (
        <section aria-labelledby="vocabulary-heading" className="mt-10">
          <h2 id="vocabulary-heading" className="text-xl font-semibold tracking-tight text-ink">
            Vocabulary
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {lesson.vocabulary.map((item) => (
              <li key={item.term} className="rounded-xl border border-line bg-surface p-4">
                {/*
                  Ruby pairs the reading with its base term in the markup, so the
                  furigana stays attached to the word it annotates instead of
                  becoming an adjacent free-floating string a screen reader reads
                  as unrelated text.
                */}
                <p className="text-lg text-ink">
                  <ruby>{item.term}<rt className="text-sm text-ink/60">{item.reading}</rt></ruby>
                </p>
                <p className="text-sm text-ink/70">
                  {item.meaning} · {item.partOfSpeech}
                </p>
                {item.exampleSentence === null ? null : (
                  <p className="mt-2 text-sm text-ink/60">
                    {item.exampleTranslation === null ? null : (
                      <span className="block text-ink/50">{item.exampleTranslation}</span>
                    )}
                    <ruby>
                      {item.exampleSentence}
                      <rt className="text-xs">
                        {item.exampleReading ?? ""}
                      </rt>
                    </ruby>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.grammar.length > 0 ? (
        <section aria-labelledby="grammar-heading" className="mt-10">
          <h2 id="grammar-heading" className="text-xl font-semibold tracking-tight text-ink">
            Grammar
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {lesson.grammar.map((item) => (
              <li key={item.pattern} className="rounded-xl border border-line bg-surface p-5">
                <p className="text-lg text-ink">
                  {item.pattern}
                  {item.reading === null ? null : (
                    <span className="ml-2 text-sm text-ink/60">{item.reading}</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-ink/70">{item.meaning}</p>
                <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="text-ink/50">Formation</dt>
                  <dd className="text-ink/80">{item.formation}</dd>
                  <dt className="text-ink/50">Register</dt>
                  <dd className="text-ink/80">{item.register}</dd>
                </dl>
                {item.explanation === null ? null : (
                  <p className="mt-3 text-sm text-ink/70">{item.explanation}</p>
                )}
                <p className="mt-3 text-sm text-ink/60">
                  <ruby>
                    {item.exampleSentence}
                    <rt className="text-xs">{item.exampleReading ?? ""}</rt>
                  </ruby>
                  <span className="mt-1 block text-ink/50">{item.exampleTranslation}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.kanji.length > 0 ? (
        <section aria-labelledby="kanji-heading" className="mt-10">
          <h2 id="kanji-heading" className="text-xl font-semibold tracking-tight text-ink">
            Kanji
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {lesson.kanji.map((item) => (
              <li key={item.character} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-2xl text-ink">{item.character}</p>
                <p className="mt-1 text-sm text-ink/70">{item.meaning}</p>
                <p className="mt-2 text-xs text-ink/60">
                  On: {item.onyomi.join(", ") || "—"}
                </p>
                <p className="text-xs text-ink/60">
                  Kun: {item.kunyomi.join(", ") || "—"}
                </p>
                {item.strokeCount === null ? null : (
                  <p className="mt-1 text-xs text-ink/50">{item.strokeCount} strokes</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="exercises-heading" className="mt-12">
        <h2 id="exercises-heading" className="text-xl font-semibold tracking-tight text-ink">
          Practice
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          {lesson.score.answeredExercises} of {lesson.score.totalExercises} answered
        </p>

        {lesson.exercises.length === 0 ? (
          <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-ink/70">
            This lesson has no published exercises yet. You can still review the
            material above.
          </p>
        ) : (
          <div className="mt-4">
            <ExerciseRunner
              exercises={lesson.exercises}
              lessonSlug={lesson.slug}
              isAuthenticated={learner.userId !== null}
            />
          </div>
        )}
      </section>

      {lesson.progressState === "completed" ? (
        <p className="mt-8 rounded-lg border border-line bg-surface px-4 py-4 text-sm text-ink/70">
          You completed this lesson with a score of {lesson.score.scorePercent}%.{" "}
          <Link
            href={`/learn/${lesson.slug}/result`}
            className="font-medium text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            View your result
          </Link>
        </p>
      ) : null}
    </main>
  );
}