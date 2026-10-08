import { ContentStatus } from "@/app/generated/prisma/client";
import {
  toPublicExercise,
  type PublicExercise,
} from "@/features/learning/answer-validation";
import {
  computeLessonScore,
  lessonProgressState,
  type AttemptRecord,
  type LessonProgressState,
  type LessonScore,
} from "@/features/learning/progress";
import { db } from "@/lib/db";

/**
 * Published-only read layer for a single lesson.
 *
 * Sibling of `curriculum.server.ts`, which owns the course-level read. The split
 * follows the query shape rather than being arbitrary: the outline aggregates
 * progress across every lesson in a course and so needs attempts grouped by
 * lesson, while this read handles exactly one lesson id and needs none of that
 * grouping machinery. Neither module exports a helper to the other.
 *
 * Two properties are enforced structurally rather than by convention:
 *
 * 1. `ExerciseOption.isCorrect` is never selected. This module does not mention
 *    the column at all, so the answer key cannot reach a Client Component even if
 *    the model grows. The only read that selects it lives in `actions.ts`.
 * 2. `Exercise.explanation` is withheld, because an explanation names the correct
 *    answer and therefore belongs to the post-grading result screen rather than
 *    to the question being answered.
 *
 * `Grammar.explanation` is deliberately still included: it teaches the pattern
 * instead of revealing a specific answer.
 *
 * AGENTS.md section 18 requires unpublished material to be unreachable through
 * either UI or APIs, so lesson, chapter, and course are each filtered on
 * `PUBLISHED` rather than trusting the caller.
 */

/**
 * Query bounds, per AGENTS.md section 7 forbidding unbounded queries. Sized well
 * above a single lesson's real content; exceeding one truncates the response
 * instead of loading an arbitrary amount.
 */
const EXERCISES_LIMIT = 60;
const VOCABULARY_LIMIT = 60;
const GRAMMAR_LIMIT = 40;
const KANJI_LIMIT = 80;
/**
 * Attempts read per learner per lesson. Attempts are append-only and indexed on
 * `(userId, lessonId)`, so this only bites a learner who has retried thousands of
 * exercises within one lesson.
 */
const ATTEMPT_HISTORY_LIMIT = 2_000;

export interface LessonVocabularyItem {
  readonly term: string;
  readonly reading: string;
  readonly meaning: string;
  readonly partOfSpeech: string;
  readonly exampleSentence: string | null;
  readonly exampleReading: string | null;
  readonly exampleTranslation: string | null;
}

export interface LessonGrammarItem {
  readonly pattern: string;
  readonly reading: string | null;
  readonly meaning: string;
  readonly formation: string;
  readonly explanation: string | null;
  readonly register: string;
  readonly exampleSentence: string;
  readonly exampleReading: string | null;
  readonly exampleTranslation: string;
}

export interface LessonKanjiItem {
  readonly character: string;
  readonly meaning: string;
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
  readonly strokeCount: number | null;
}

export interface LessonForLearner {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly estimatedMinutes: number;
  readonly course: { readonly slug: string; readonly title: string };
  readonly chapter: { readonly slug: string; readonly title: string };
  readonly vocabulary: readonly LessonVocabularyItem[];
  readonly grammar: readonly LessonGrammarItem[];
  readonly kanji: readonly LessonKanjiItem[];
  readonly exercises: readonly PublicExercise[];
  readonly score: LessonScore;
  readonly progressState: LessonProgressState;
}

interface LearnerLessonState {
  readonly attempts: readonly AttemptRecord[];
  readonly hasCompletion: boolean;
}

/**
 * The learner's stored progress for one lesson.
 *
 * An anonymous caller short-circuits to an untouched state rather than failing, so
 * the same query serves a preview and a signed-in learner.
 */
async function readLearnerLessonState(
  userId: string | null,
  lessonId: string,
): Promise<LearnerLessonState> {
  if (userId === null) {
    return { attempts: [], hasCompletion: false };
  }

  const [attempts, completion] = await Promise.all([
    db.exerciseAttempt.findMany({
      where: { userId, lessonId },
      select: {
        exerciseId: true,
        isCorrect: true,
        attemptNumber: true,
        createdAt: true,
      },
      orderBy: { attemptNumber: "asc" },
      take: ATTEMPT_HISTORY_LIMIT,
    }),
    db.lessonCompletion.findFirst({
      where: { userId, lessonId },
      select: { id: true },
    }),
  ]);

  return {
    attempts: attempts.map((attempt) => ({
      exerciseId: attempt.exerciseId,
      isCorrect: attempt.isCorrect,
      attemptNumber: attempt.attemptNumber,
      createdAt: attempt.createdAt,
    })),
    hasCompletion: completion !== null,
  };
}

/**
 * One published lesson with its study content and the learner's progress.
 *
 * Returns `null` when the lesson, its chapter, or its course is missing or
 * unpublished. The three unpublished cases are deliberately indistinguishable, so
 * this read cannot be used to discover draft material or to tell a learner that a
 * slug exists but is not yet released.
 */
export async function getLessonForLearner(input: {
  readonly courseSlug: string;
  readonly lessonSlug: string;
  readonly userId: string | null;
}): Promise<LessonForLearner | null> {
  // `Lesson` is unique on `(chapterId, slug)`, not on slug alone, so the course
  // scope has to be part of the filter and `findUnique` cannot express it.
  const lesson = await db.lesson.findFirst({
    where: {
      slug: input.lessonSlug,
      status: ContentStatus.PUBLISHED,
      chapter: {
        status: ContentStatus.PUBLISHED,
        course: {
          slug: input.courseSlug,
          status: ContentStatus.PUBLISHED,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      order: true,
      estimatedMinutes: true,
      chapter: {
        select: {
          slug: true,
          title: true,
          course: { select: { slug: true, title: true } },
        },
      },
      vocabulary: {
        orderBy: { order: "asc" },
        take: VOCABULARY_LIMIT,
        select: {
          vocabulary: {
            select: {
              term: true,
              reading: true,
              meaning: true,
              partOfSpeech: true,
              exampleSentence: true,
              exampleReading: true,
              exampleTranslation: true,
            },
          },
        },
      },
      grammar: {
        orderBy: { order: "asc" },
        take: GRAMMAR_LIMIT,
        select: {
          grammar: {
            select: {
              pattern: true,
              reading: true,
              meaning: true,
              formation: true,
              explanation: true,
              register: true,
              exampleSentence: true,
              exampleReading: true,
              exampleTranslation: true,
            },
          },
        },
      },
      kanji: {
        orderBy: { order: "asc" },
        take: KANJI_LIMIT,
        select: {
          kanji: {
            select: {
              character: true,
              meaning: true,
              onyomi: true,
              kunyomi: true,
              strokeCount: true,
            },
          },
        },
      },
      exercises: {
        where: { status: ContentStatus.PUBLISHED },
        orderBy: { order: "asc" },
        take: EXERCISES_LIMIT,
        select: {
          id: true,
          type: true,
          prompt: true,
          order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, label: true },
          },
        },
      },
    },
  });

  if (lesson === null) {
    return null;
  }

  const { attempts, hasCompletion } = await readLearnerLessonState(
    input.userId,
    lesson.id,
  );

  const exercises: PublicExercise[] = lesson.exercises.map(toPublicExercise);

  // The published exercise ids are the score denominator, so an attempt against a
  // since-unpublished exercise cannot mark the lesson answered or lift its score.
  const score = computeLessonScore(
    exercises.map((exercise) => exercise.id),
    attempts,
  );

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    estimatedMinutes: lesson.estimatedMinutes,
    course: {
      slug: lesson.chapter.course.slug,
      title: lesson.chapter.course.title,
    },
    chapter: { slug: lesson.chapter.slug, title: lesson.chapter.title },
    vocabulary: lesson.vocabulary.map((row) => row.vocabulary),
    grammar: lesson.grammar.map((row) => row.grammar),
    kanji: lesson.kanji.map((row) => row.kanji),
    exercises,
    score,
    progressState: lessonProgressState(score, hasCompletion),
  };
}
