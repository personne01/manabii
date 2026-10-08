/** One persisted answer outcome, as stored in `ExerciseAttempt`. */
export interface AttemptRecord {
  readonly exerciseId: string;
  readonly isCorrect: boolean;
  readonly attemptNumber: number;
  readonly createdAt: Date;
}

export interface LessonScore {
  readonly totalExercises: number;
  readonly answeredExercises: number;
  readonly correctExercises: number;
  readonly scorePercent: number;
  readonly completed: boolean;
}

export type LessonProgressState = "not_started" | "in_progress" | "completed";

/**
 * Reduces retry history to one outcome per exercise.
 *
 * `attemptNumber` is a per-user, per-exercise retry counter under a unique
 * constraint, so it is monotonic and collision-free; comparing it avoids
 * relying on timestamp precision or map insertion order.
 */
export function latestAttemptPerExercise(
  attempts: readonly AttemptRecord[],
): Map<string, AttemptRecord> {
  const latest = new Map<string, AttemptRecord>();

  for (const attempt of attempts) {
    const current = latest.get(attempt.exerciseId);
    if (current === undefined || attempt.attemptNumber > current.attemptNumber) {
      latest.set(attempt.exerciseId, attempt);
    }
  }

  return latest;
}

/**
 * Derives a lesson score from persisted attempts.
 *
 * Takes the current exercise ids rather than a total so that attempts against
 * since-unpublished exercises cannot mark a lesson answered or inflate its
 * score. Retries do not inflate anything: only the latest attempt per exercise
 * counts, once.
 */
export function computeLessonScore(
  exerciseIds: readonly string[],
  attempts: readonly AttemptRecord[],
): LessonScore {
  const currentExerciseIds = new Set(exerciseIds);
  const latest = latestAttemptPerExercise(attempts);
  const totalExercises = currentExerciseIds.size;

  let answeredExercises = 0;
  let correctExercises = 0;

  for (const exerciseId of currentExerciseIds) {
    const attempt = latest.get(exerciseId);
    if (attempt === undefined) {
      continue;
    }
    answeredExercises += 1;
    if (attempt.isCorrect) {
      correctExercises += 1;
    }
  }

  return {
    totalExercises,
    answeredExercises,
    correctExercises,
    scorePercent:
      totalExercises === 0
        ? 0
        : Math.round((correctExercises / totalExercises) * 100),
    completed: totalExercises > 0 && answeredExercises === totalExercises,
  };
}

/**
 * Completion is event-driven via `LessonCompletion`, but a fully answered lesson
 * also reads as completed so the UI matches what the learner actually did.
 */
export function lessonProgressState(
  score: LessonScore,
  hasCompletionRecord: boolean,
): LessonProgressState {
  if (hasCompletionRecord || score.completed) {
    return "completed";
  }
  if (score.answeredExercises > 0) {
    return "in_progress";
  }
  return "not_started";
}

export function courseProgressPercent(
  totalLessons: number,
  completedLessons: number,
): number {
  if (totalLessons <= 0) {
    return 0;
  }
  const bounded = Math.min(Math.max(completedLessons, 0), totalLessons);
  return Math.round((bounded / totalLessons) * 100);
}
