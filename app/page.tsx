import Image from "next/image";
import Link from "next/link";

import { DEFAULT_COURSE_SLUG } from "@/features/learning/course-slug";
import { getCourseOutline } from "@/features/learning/curriculum.server";

/**
 * Public landing page.
 *
 * A Server Component that reads the *published* curriculum from PostgreSQL rather
 * than hardcoding marketing copy about a course that may not exist yet. Two
 * consequences worth stating:
 *
 * 1. What this page advertises is what a learner can actually open. The read is
 *    published-only, so a draft chapter cannot be promoted here before it is
 *    reachable at `/learn` (AGENTS.md section 18).
 * 2. When no course is published, `getCourseOutline` returns `null` and the page
 *    degrades to the promise plus a sign-in path. It must never invent chapter
 *    titles, lesson counts, or a level badge: a landing page is the one surface a
 *    visitor believes without checking.
 *
 * The user id is deliberately `null`. This is the anonymous entry point, and
 * nothing on it is per-learner, so resolving a session would only add a database
 * round trip. Progress belongs on `/learn`, which already serves the signed-out
 * preview and the signed-in dashboard from one query.
 *
 * No Client Component and no state: the rendered output is markup plus links, so
 * it ships no client JavaScript (AGENTS.md section 16).
 *
 * Rendering is forced per request instead of prerendered. A build-time snapshot
 * would freeze the outline into HTML, so a chapter published or archived after
 * the build would keep being advertised here with no invalidation rule to correct
 * it (AGENTS.md section 16). The page cannot pick up dynamic rendering from a
 * session read the way `/learn` does, because it deliberately resolves no
 * session, so it opts in explicitly -- the same `force-dynamic` the auth route
 * handler uses.
 */
export const dynamic = "force-dynamic";

/** `getCourseOutline` is only ever called with a published course or not at all. */
type PublishedOutline = NonNullable<Awaited<ReturnType<typeof getCourseOutline>>>;

interface StatDefinition {
  readonly label: string;
  readonly value: string;
}

/**
 * Formats a minute count without inventing precision.
 *
 * An hour appears only when there is a real whole hour to show, so 45 minutes
 * reads "45 min" rather than a rounded value no learner can match against the
 * per-lesson estimates on `/learn`.
 */
function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/**
 * Curriculum facts, derived from the outline rather than asserted.
 *
 * A zero total is omitted rather than rendered, because "0 lessons" reads as a
 * broken product whereas an absent row reads as content still in preparation,
 * which is the truth.
 */
function buildStats(outline: PublishedOutline): readonly StatDefinition[] {
  const totalMinutes = outline.chapters
    .flatMap((chapter) => chapter.lessons)
    .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);

  const stats: StatDefinition[] = [
    { label: "Chapters", value: String(outline.chapters.length) },
    { label: "Lessons", value: String(outline.totalLessons) },
  ];

  if (totalMinutes > 0) {
    stats.push({ label: "Study time", value: formatDuration(totalMinutes) });
  }

  return stats;
}

/**
 * The sections a lesson page actually renders today.
 *
 * Deliberately limited to the four things `/learn/[lessonSlug]` serves. Kotoba,
 * Bunpou, and Kanji have real seeded content and real read paths. Dokkai,
 * Sakubun, Choukai, and Kaiwa are roadmap items with nothing behind them, so
 * naming them here would be a claim the product cannot honour (AGENTS.md section
 * 22).
 */
const LESSON_SECTIONS = [
  {
    title: "Kotoba",
    japanese: "言葉",
    body: "Every word with its reading, part of speech, and a sentence you would actually say.",
  },
  {
    title: "Bunpou",
    japanese: "文法",
    body: "Each pattern explained by meaning, formation, and register, with the mistakes learners really make.",
  },
  {
    title: "Kanji",
    japanese: "漢字",
    body: "Onyomi and kunyomi kept apart, so the reading you are taught is the reading that applies.",
  },
  {
    title: "Practice",
    japanese: "練習",
    body: "Exercises graded on the server. The answer key is never sent to the browser.",
  },
] as const;

export default async function Home() {
  const outline = await getCourseOutline({
    courseSlug: DEFAULT_COURSE_SLUG,
    userId: null,
  });

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/manabii-mark.svg"
            alt=""
            width={56}
            height={70}
            unoptimized
            priority
          />
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-ink/50">
            Manabii
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Every day, a little more Japanese.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
            Structured study built around short lessons, clear grammar, and practice
            that tells you where you actually stand.
          </p>

          <div className="mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/learn"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Start learning
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-6 py-3 font-medium text-ink transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-sm text-ink/50">
            You can preview the lessons without an account.
          </p>
        </div>
      </section>

      {outline === null ? (
        <section className="mx-auto w-full max-w-2xl px-6 pb-20">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">
              The first course is still being prepared
            </h2>
            <p className="mt-2 text-ink/70">
              No lessons are published yet, so there is nothing to preview. Create an
              account and the dashboard will be ready when the first chapter is
              released.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Create an account
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="border-y border-line bg-surface">
            <div className="mx-auto w-full max-w-4xl px-6 py-14">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-ink/50">
                    JLPT {outline.level}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                    {outline.title}
                  </h2>
                  <p className="mt-3 max-w-xl leading-7 text-ink/70">
                    {outline.description}
                  </p>
                </div>

                <dl className="flex shrink-0 gap-8">
                  {buildStats(outline).map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-sm text-ink/50">{stat.label}</dt>
                      <dd className="mt-1 text-2xl font-semibold text-ink">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <ol className="mt-10 grid gap-3 sm:grid-cols-2">
                {outline.chapters.map((chapter) => (
                  <li
                    key={chapter.id}
                    className="rounded-xl border border-line bg-canvas p-5"
                  >
                    <h3 className="font-semibold text-ink">{chapter.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/70">
                      {chapter.description}
                    </p>
                    <p className="mt-3 text-sm text-ink/50">
                      {chapter.lessons.length}{" "}
                      {chapter.lessons.length === 1 ? "lesson" : "lessons"}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mx-auto w-full max-w-4xl px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Inside every lesson
            </h2>
            <p className="mt-2 max-w-xl text-ink/70">
              A lesson teaches the words, the grammar, and the kanji, then checks
              whether any of it stuck.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {LESSON_SECTIONS.map((section) => (
                <div
                  key={section.title}
                  className="rounded-xl border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-ink">{section.title}</h3>
                    <span lang="ja" className="text-sm text-ink/50">
                      {section.japanese}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{section.body}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-6 py-8 text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>Manabii — every day, a little more Japanese.</p>
          {outline === null ? null : (
            <p>Curriculum content is drafted and under review before it is treated as authoritative.</p>
          )}
        </div>
      </footer>
    </main>
  );
}