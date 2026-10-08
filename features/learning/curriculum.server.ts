import { ContentStatus, type JLPTLevel } from "@/app/generated/prisma/client";
import {
  computeLessonScore,
  courseProgressPercent,
  lessonProgressState,
  type AttemptRecord,
  type LessonProgressState,
} from "@/features/learning/progress";
import { db } from "@/lib/db";

/**
 * Published-only read layer for the learner-facing curriculum.
 *
 * Two properties are load-bearing and are enforced structurally rather than by
 * convention:
 *
 * 1. This module never mentions `ExerciseOption.isCorrect`, so the answer key
 *    cannot leak into a Client Component even by accident when the model grows.
 *    The only read that selects the key lives in `features/learning/actions.ts`.
 * 2. `Exercise.explanation` is withheld here as well. An explanation names the
 *    correct answer, so it belongs to the post-grading result screen rather than
 *    to the question being answered.
 *
 * AGENTS.md section 18 requires unpublished material to be unreachable, so every
 * level of every query filters on `PUBLISHED` rather than trusting a caller.
 */

/**
 * Query bounds. AGENTS.md section 7 forbids unbounded queries. These are
 * deliberate upper bounds sized well above a single JLPT level's real content;
 * exceeding one means the response is truncated rather than unbounded.
 */
const CHAPTER_LIMIT = 20;
const LESSONS_PER_CHAPTER_LIMIT = 100;
const EXERCISES_PER_LESSON_LIMIT = 60;
/**
 * Attempt history read per learner per request. Attempts are append-only and
 * indexed on `(userId, lessonId)`, so this only bites a user who has retried
 * thousands of exercises in one lesson.
 */
const ATTEMPT_HISTORY_LIMIT = 2_000;

export interface CourseOutlineLesson {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly order: number;
  readonly estimatedMinutes: number;
  readonly scorePercent: number;
  readonly progressState: LessonProgressState;
}

export interface CourseOutlineChapter {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly order: number;
  readonly lessons: readonly CourseOutlineLesson[];
}

export interface CourseOutline {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly level: JLPTLevel;
  readonly chapters: readonly CourseOutlineChapter[];
  readonly totalLessons: number;
  readonly completedLessons: number;
  readonly progressPercent: number;
}

/**
 * Published exercise ids per lesson.
 *
 * These ids are both the score denominator and the set an attempt must belong to,
 * so an attempt against a since-unpublished exercise cannot mark a lesson
 * answered or inflate its score.
 */
async function readPublishedExerciseIds(
  lessonIds: readonly string[],
): Promise<Map<string, readonly string[]>> {
  if (lessonIds.length === 0) {
    return new Map();
  }

  const exercises = await db.exercise.findMany({
    where: { lessonId: { in: [...lessonIds] }, status: ContentStatus.PUBLISHED },
    select: { id: true, lessonId: true },
    take: lessonIds.length * EXERCISES_PER_LESSON_LIMIT,
  });

  const byLesson = new Map<string, string[]>();
  for (const exercise of exercises) {
    const bucket = byLesson.get(exercise.lessonId);
    if (bucket === undefined) {
      byLesson.set(exercise.lessonId, [exercise.id]);
    } else {
      bucket.push(exercise.id);
    }
  }

  return byLesson;
}

async function readAttemptsByLesson(
  userId: string | null,
  lessonIds: readonly string[],
): Promise<Map<string, readonly AttemptRecord[]>> {
  if (userId === null || lessonIds.length === 0) {
    return new Map();
  }

  const attempts = await db.exerciseAttempt.findMany({
    where: { userId, lessonId: { in: [...lessonIds] } },
    select: {
      exerciseId: true,
      isCorrect: true,
      attemptNumber: true,
      createdAt: true,
      lessonId: true,
    },
    orderBy: { attemptNumber: "asc" },
    take: ATTEMPT_HISTORY_LIMIT,
  });

  const byLesson = new Map<string, AttemptRecord[]>();
  for (const attempt of attempts) {
    const record: AttemptRecord = {
      exerciseId: attempt.exerciseId,
      isCorrect: attempt.isCorrect,
      attemptNumber: attempt.attemptNumber,
      createdAt: attempt.createdAt,
    };
    const bucket = byLesson.get(attempt.lessonId);
    if (bucket === undefined) {
      byLesson.set(attempt.lessonId, [record]);
    } else {
      bucket.push(record);
    }
  }

  return byLesson;
}

async function readCompletedLessonIds(
  userId: string | null,
  lessonIds: readonly string[],
): Promise<ReadonlySet<string>> {
  if (userId === null || lessonIds.length === 0) {
    return new Set();
  }

  const completions = await db.lessonCompletion.findMany({
    where: { userId, lessonId: { in: [...lessonIds] } },
    select: { lessonId: true },
    take: lessonIds.length,
  });

  return new Set(completions.map((completion) => completion.lessonId));
}

/**
 * Course outline with per-lesson progress.
 *
 * `userId` may be `null` for an anonymous preview; every lesson then reports
 * `not_started` with a zero score rather than failing, so the same query serves
 * the signed-out marketing view and the signed-in dashboard.
 */
export async function getCourseOutline(input: {
  readonly courseSlug: string;
  readonly userId: string | null;
}): Promise<CourseOutline | null> {
  const course = await db.course.findFirst({
    where: { slug: input.courseSlug, status: ContentStatus.PUBLISHED },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      level: true,
      chapters: {
        where: { status: ContentStatus.PUBLISHED },
        orderBy: { order: "asc" },
        take: CHAPTER_LIMIT,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          order: true,
          lessons: {
            where: { status: ContentStatus.PUBLISHED },
            orderBy: { order: "asc" },
            take: LESSONS_PER_CHAPTER_LIMIT,
            select: {
              id: true,
              slug: true,
              title: true,
              order: true,
              estimatedMinutes: true,
            },
          },
        },
      },
    },
  });

  if (course === null) {
    return null;
  }

  const lessonIds = course.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => lesson.id),
  );

  const [exerciseIdsByLesson, attemptsByLesson, completedIds] = await Promise.all([
    readPublishedExerciseIds(lessonIds),
    readAttemptsByLesson(input.userId, lessonIds),
    readCompletedLessonIds(input.userId, lessonIds),
  ]);

  const chapters: CourseOutlineChapter[] = course.chapters.map((chapter) => ({
    id: chapter.id,
    slug: chapter.slug,
    title: chapter.title,
    description: chapter.description,
    order: chapter.order,
    lessons: chapter.lessons.map((lesson) => {
      const score = computeLessonScore(
        exerciseIdsByLesson.get(lesson.id) ?? [],
        attemptsByLesson.get(lesson.id) ?? [],
      );

      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        order: lesson.order,
        estimatedMinutes: lesson.estimatedMinutes,
        scorePercent: score.scorePercent,
        progressState: lessonProgressState(score, completedIds.has(lesson.id)),
      };
    }),
  }));

  const allLessons = chapters.flatMap((chapter) => chapter.lessons);
  const completedLessons = allLessons.filter(
    (lesson) => lesson.progressState === "completed",
  ).length;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    level: course.level,
    chapters,
    totalLessons: allLessons.length,
    completedLessons,
    progressPercent: courseProgressPercent(allLessons.length, completedLessons),
  };
}
