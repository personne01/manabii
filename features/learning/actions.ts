"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";

import { ContentStatus, Prisma } from "@/app/generated/prisma/client";
import { gradeAnswer } from "@/features/learning/answer-validation";
import { authOptions } from "@/lib/auth";
import { requireUser } from "@/lib/authorization.server";
import { db } from "@/lib/db";

/**
 * The only module that grades an answer.
 *
 * `AGENTS.md` section 10 requires authoritative scores to be calculated on the
 * server, and section 11 requires that browser-submitted data be treated as
 * untrusted. Both are why this file exists and why nothing else grades: the
 * option id arrives from the browser, and the verdict is derived here from a
 * database read that the browser cannot influence.
 *
 * It is also the only read in the application that selects
 * `ExerciseOption.isCorrect`. The learner-facing read layers project exercises
 * explicitly (`toPublicExercise`), so an answer key never crosses that boundary
 * before the learner has actually answered.
 */

const submitAnswerInput = z.object({
  exerciseId: z.string().uuid(),
  optionId: z.string().uuid(),
});

/**
 * Retry budget for the append-only `attemptNumber` counter.
 *
 * `ExerciseAttempt` is unique on `(exerciseId, userId, attemptNumber)`. Two
 * concurrent submissions of the same exercise can both read the same maximum and
 * both try to claim the next number; the loser gets `P2002` and re-reads. This
 * budget exists so a pathological double-submit cannot spin: it turns the
 * database's uniqueness guarantee into a retry instead of a user-visible error.
 */
const ATTEMPT_WRITE_ATTEMPTS = 3;

/**
 * Why a submission did not produce an attempt.
 *
 * `unauthenticated` and `unknown_user` are deliberately not both present. They
 * are genuinely different states, but `lib/api.ts` already answers them
 * identically over HTTP so the API cannot be used to probe which account UUIDs
 * exist; a Server Action must not reopen that hole by returning a finer-grained
 * reason for the same question.
 */
export type SubmitAnswerFailureReason =
  | "unauthenticated"
  | "forbidden"
  | "invalid_input"
  | "unknown_exercise"
  | "ungradeable_exercise"
  | "unknown_option"
  | "conflict"
  | "internal_error";

/**
 * The graded outcome. `correctOptionId`, `correctLabel`, and `explanation` are
 * absent from the pre-answer projection and are returned only here, after a real
 * submission, which is exactly when showing the answer key is the point.
 */
export type SubmitAnswerResult =
  | {
      readonly ok: true;
      readonly isCorrect: boolean;
      readonly correctOptionId: string;
      readonly correctLabel: string;
      readonly explanation: string | null;
      readonly attemptNumber: number;
      readonly lessonCompleted: boolean;
    }
  | { readonly ok: false; readonly reason: SubmitAnswerFailureReason };

interface AttemptWrite {
  readonly userId: string;
  readonly exerciseId: string;
  readonly lessonId: string;
  readonly isCorrect: boolean;
  readonly givenOptionId: string;
}

type AttemptOutcome =
  | { readonly ok: true; readonly attemptNumber: number; readonly lessonCompleted: boolean }
  | { readonly ok: false; readonly reason: "conflict" | "internal_error" };

/**
 * Detects the `attemptNumber` uniqueness race specifically.
 *
 * Inside `recordAttemptInTransaction` the only inserting statements are the
 * attempt create and a `LessonCompletion` upsert, and the upsert targets the
 * composite unique key rather than triggering it. So `P2002` here can only mean
 * the attempt counter collided, which is the retryable case.
 */
function isAttemptCounterRace(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/**
 * Records lesson completion once every published exercise has been answered.
 *
 * Completion is derived rather than requested, so a client cannot claim a lesson
 * is finished and `LessonCompletion` cannot drift from the attempts that justify
 * it. Two guards keep it honest:
 *
 * - The denominator is only currently published exercises, matching the score
 *   `lesson.server.ts` computes, so a lesson cannot complete against exercises
 *   a learner was never shown.
 * - A lesson with no published exercises is never completed, otherwise the first
 *   visit would instantly record completion for an empty lesson.
 *
 * The upsert is idempotent via `@@unique([userId, lessonId])`, so revisiting a
 * completed lesson adds no second row (`AGENTS.md` section 10: avoid duplicate
 * progress events).
 */
async function deriveLessonCompletion(
  tx: Prisma.TransactionClient,
  userId: string,
  lessonId: string,
): Promise<boolean> {
  const publishedCount = await tx.exercise.count({
    where: { lessonId, status: ContentStatus.PUBLISHED },
  });
  if (publishedCount === 0) {
    return false;
  }

  const answered = await tx.exerciseAttempt.groupBy({
    by: ["exerciseId"],
    where: {
      userId,
      lessonId,
      // An attempt on an exercise that has since been archived must not count
      // toward completing the lesson as it now stands.
      exercise: { status: ContentStatus.PUBLISHED },
    },
  });
  if (answered.length !== publishedCount) {
    return false;
  }

  await tx.lessonCompletion.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });
  return true;
}

/**
 * Appends one attempt and, if it completed the lesson, records that too.
 *
 * The two writes share a transaction so a learner can never hold an attempt
 * without its derived completion, or a completion without the attempt that
 * justified it (`AGENTS.md` section 7: transactions for atomic business
 * operations).
 */
async function recordAttemptInTransaction(
  write: AttemptWrite,
): Promise<{ attemptNumber: number; lessonCompleted: boolean }> {
  return db.$transaction(async (tx) => {
    const latest = await tx.exerciseAttempt.aggregate({
      where: { userId: write.userId, exerciseId: write.exerciseId },
      _max: { attemptNumber: true },
    });
    const attemptNumber = (latest._max.attemptNumber ?? 0) + 1;

    await tx.exerciseAttempt.create({
      data: { ...write, attemptNumber },
      select: { id: true },
    });

    const lessonCompleted = await deriveLessonCompletion(tx, write.userId, write.lessonId);
    return { attemptNumber, lessonCompleted };
  });
}

/** Runs one transaction attempt, distinguishing a retryable race from a real failure. */
async function tryRecordAttempt(write: AttemptWrite): Promise<AttemptOutcome | "retry"> {
  try {
    const recorded = await recordAttemptInTransaction(write);
    return { ok: true, ...recorded };
  } catch (error) {
    if (isAttemptCounterRace(error)) {
      return "retry";
    }
    // `AGENTS.md` section 19: log the failure, never surface it. The reason is
    // logged without user content so a stack trace cannot carry learner text.
    console.error("submitAnswer: unexpected failure", {
      exerciseId: write.exerciseId,
      lessonId: write.lessonId,
      error,
    });
    return { ok: false, reason: "internal_error" };
  }
}

/**
 * Grades one submitted answer and appends the resulting attempt.
 *
 * Returns a discriminated union rather than throwing so a caller cannot treat a
 * refusal as a success by forgetting to check `ok` — the same reasoning that
 * shapes `AuthorizationResult`.
 */
export async function submitAnswer(rawInput: {
  readonly exerciseId: string;
  readonly optionId: string;
}): Promise<SubmitAnswerResult> {
  const parsed = submitAnswerInput.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  const { exerciseId, optionId } = parsed.data;

  const session = await getServerSession(authOptions);
  const auth = await requireUser(session);
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.failure.reason === "forbidden" ? "forbidden" : "unauthenticated",
    };
  }

  // SECURITY: the one place `isCorrect` is selected. Scoped through every
  // publishing level so a draft exercise cannot be graded by guessing its UUID,
  // and so an archived question stops accepting answers the moment it is
  // archived. `gradeAnswer` then scopes the option lookup to this exercise, so an
  // option id borrowed from a different question rejects rather than scoring.
  const exercise = await db.exercise.findFirst({
    where: {
      id: exerciseId,
      status: ContentStatus.PUBLISHED,
      lesson: {
        status: ContentStatus.PUBLISHED,
        chapter: {
          status: ContentStatus.PUBLISHED,
          course: { status: ContentStatus.PUBLISHED },
        },
      },
    },
    select: {
      id: true,
      type: true,
      explanation: true,
      lessonId: true,
      options: {
        select: { id: true, label: true, isCorrect: true },
        orderBy: { order: "asc" },
      },
    },
  });
  if (exercise === null) {
    return { ok: false, reason: "unknown_exercise" };
  }

  const graded = gradeAnswer(exercise, optionId);
  if (graded.outcome === "rejected") {
    return { ok: false, reason: graded.reason };
  }

  const write: AttemptWrite = {
    userId: auth.user.id,
    exerciseId: exercise.id,
    lessonId: exercise.lessonId,
    isCorrect: graded.isCorrect,
    givenOptionId: optionId,
  };

  let recorded: AttemptOutcome = { ok: false, reason: "conflict" };
  for (let attempt = 0; attempt < ATTEMPT_WRITE_ATTEMPTS; attempt += 1) {
    const outcome = await tryRecordAttempt(write);
    if (outcome !== "retry") {
      recorded = outcome;
      break;
    }
  }
  if (!recorded.ok) {
    return { ok: false, reason: recorded.reason };
  }

  return {
    ok: true,
    isCorrect: graded.isCorrect,
    correctOptionId: graded.correctOptionId,
    correctLabel: graded.correctLabel,
    explanation: graded.explanation,
    attemptNumber: recorded.attemptNumber,
    lessonCompleted: recorded.lessonCompleted,
  };
}
