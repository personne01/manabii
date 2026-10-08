import { describe, expect, it } from "vitest";

import {
  computeLessonScore,
  courseProgressPercent,
  latestAttemptPerExercise,
  lessonProgressState,
  type AttemptRecord,
  type LessonScore,
} from "@/features/learning/progress";

/**
 * Pure progress tests.
 *
 * Progress is authoritative only if it is reproducible from persisted records
 * alone, so this suite derives every number from `ExerciseAttempt` rows and no
 * database. The two invariants worth protecting are that a retry can change an
 * exercise's outcome but never its weight in the score, and that an attempt
 * against an exercise no longer in the lesson cannot make the lesson look
 * further along than it is.
 */

const MINUTE = 60_000;
const BASE_TIME = Date.UTC(2026, 0, 1);

/** Exercise ids stand in for UUIDs; only identity matters to these functions. */
const EXERCISE_A = "0192f4a1-0000-7000-8000-00000000000a";
const EXERCISE_B = "0192f4a1-0000-7000-8000-00000000000b";
const EXERCISE_C = "0192f4a1-0000-7000-8000-00000000000c";
const EXERCISE_D = "0192f4a1-0000-7000-8000-00000000000d";

/**
 * Builds an attempt record. Timestamps advance with `attemptNumber` by default
 * so that the common case is monotonic; tests that deliberately invert the two
 * pass an explicit `offsetMinutes`.
 */
function attempt(
  exerciseId: string,
  attemptNumber: number,
  isCorrect: boolean,
  offsetMinutes = attemptNumber * 10,
): AttemptRecord {
  return {
    exerciseId,
    attemptNumber,
    isCorrect,
    createdAt: new Date(BASE_TIME + offsetMinutes * MINUTE),
  };
}

describe("latestAttemptPerExercise", () => {
  it("returns nothing for an empty history", () => {
    expect(latestAttemptPerExercise([]).size).toBe(0);
  });

  it("keeps exactly one record per exercise", () => {
    const latest = latestAttemptPerExercise([
      attempt(EXERCISE_A, 1, false),
      attempt(EXERCISE_A, 2, true),
      attempt(EXERCISE_B, 1, false),
      attempt(EXERCISE_B, 2, false),
      attempt(EXERCISE_B, 3, true),
    ]);

    expect([...latest.keys()].sort()).toEqual([EXERCISE_A, EXERCISE_B].sort());
  });

  it("treats attemptNumber as authoritative even when a lower attempt is newer", () => {
    // Attempt 2 was recorded before attempt 1 in wall-clock terms. Ordering must
    // still follow the monotonic retry counter, not timestamp precision.
    const latest = latestAttemptPerExercise([
      attempt(EXERCISE_A, 2, true, 0),
      attempt(EXERCISE_A, 1, false, 500),
    ]);

    expect(latest.get(EXERCISE_A)?.isCorrect).toBe(true);
    expect(latest.get(EXERCISE_A)?.attemptNumber).toBe(2);
  });
});

describe("computeLessonScore", () => {
  it("scores a lesson with no exercises as zero and incomplete", () => {
    expect(computeLessonScore([], [])).toEqual({
      totalExercises: 0,
      answeredExercises: 0,
      correctExercises: 0,
      scorePercent: 0,
      completed: false,
    });
  });

  const MATRIX: readonly {
    readonly label: string;
    readonly exerciseIds: readonly string[];
    readonly attempts: readonly AttemptRecord[];
    readonly expected: LessonScore;
  }[] = [
    {
      label: "a partially answered lesson",
      exerciseIds: [EXERCISE_A, EXERCISE_B, EXERCISE_C, EXERCISE_D],
      attempts: [attempt(EXERCISE_A, 1, true), attempt(EXERCISE_B, 1, false)],
      expected: {
        totalExercises: 4,
        answeredExercises: 2,
        correctExercises: 1,
        scorePercent: 25,
        completed: false,
      },
    },
    {
      label: "a fully answered, fully correct lesson",
      exerciseIds: [EXERCISE_A, EXERCISE_B, EXERCISE_C, EXERCISE_D],
      attempts: [
        attempt(EXERCISE_A, 1, true),
        attempt(EXERCISE_B, 1, true),
        attempt(EXERCISE_C, 1, true),
        attempt(EXERCISE_D, 1, true),
      ],
      expected: {
        totalExercises: 4,
        answeredExercises: 4,
        correctExercises: 4,
        scorePercent: 100,
        completed: true,
      },
    },
    {
      label: "a fully answered lesson with wrong answers",
      exerciseIds: [EXERCISE_A, EXERCISE_B, EXERCISE_C, EXERCISE_D],
      attempts: [
        attempt(EXERCISE_A, 1, false),
        attempt(EXERCISE_B, 1, false),
        attempt(EXERCISE_C, 1, false),
        attempt(EXERCISE_D, 1, false),
      ],
      expected: {
        totalExercises: 4,
        answeredExercises: 4,
        correctExercises: 0,
        scorePercent: 0,
        completed: true,
      },
    },
    {
      label: "a two-thirds score, rounded to a whole percent",
      exerciseIds: [EXERCISE_A, EXERCISE_B, EXERCISE_C],
      attempts: [
        attempt(EXERCISE_A, 1, true),
        attempt(EXERCISE_B, 1, true),
      ],
      expected: {
        totalExercises: 3,
        answeredExercises: 2,
        correctExercises: 2,
        scorePercent: 67,
        completed: false,
      },
    },
    {
      label: "retries that only change the outcome",
      exerciseIds: [EXERCISE_A, EXERCISE_B],
      attempts: [
        attempt(EXERCISE_A, 1, false),
        attempt(EXERCISE_A, 2, true),
        attempt(EXERCISE_B, 1, true),
      ],
      expected: {
        totalExercises: 2,
        answeredExercises: 2,
        correctExercises: 2,
        scorePercent: 100,
        completed: true,
      },
    },
    {
      label: "a repeated wrong retry, which must not earn credit",
      exerciseIds: [EXERCISE_A, EXERCISE_B],
      attempts: [
        attempt(EXERCISE_A, 1, false),
        attempt(EXERCISE_A, 2, false),
        attempt(EXERCISE_A, 3, false),
        attempt(EXERCISE_B, 1, true),
      ],
      expected: {
        totalExercises: 2,
        answeredExercises: 2,
        correctExercises: 1,
        scorePercent: 50,
        completed: true,
      },
    },
    {
      label: "attempts against exercises outside the current lesson",
      exerciseIds: [EXERCISE_A],
      attempts: [
        attempt(EXERCISE_A, 1, true),
        attempt("0192f4a1-0000-7000-8000-000000000fff", 1, true),
      ],
      expected: {
        totalExercises: 1,
        answeredExercises: 1,
        correctExercises: 1,
        scorePercent: 100,
        completed: true,
      },
    },
    {
      label: "a retired attempt that must not complete the lesson",
      exerciseIds: [EXERCISE_A, EXERCISE_B],
      attempts: [
        attempt(EXERCISE_A, 1, true),
        attempt("0192f4a1-0000-7000-8000-000000000fff", 1, true),
      ],
      expected: {
        totalExercises: 2,
        answeredExercises: 1,
        correctExercises: 1,
        scorePercent: 50,
        completed: false,
      },
    },
    {
      label: "duplicate exercise ids, all answered",
      exerciseIds: [EXERCISE_A, EXERCISE_A, EXERCISE_B],
      attempts: [attempt(EXERCISE_A, 1, true), attempt(EXERCISE_B, 1, true)],
      expected: {
        totalExercises: 2,
        answeredExercises: 2,
        correctExercises: 2,
        scorePercent: 100,
        completed: true,
      },
    },
    {
      label: "duplicate exercise ids, one unanswered",
      exerciseIds: [EXERCISE_A, EXERCISE_A, EXERCISE_B],
      attempts: [attempt(EXERCISE_A, 1, true)],
      expected: {
        totalExercises: 2,
        answeredExercises: 1,
        correctExercises: 1,
        scorePercent: 50,
        completed: false,
      },
    },
  ];

  it.each(MATRIX)("scores $label", ({ exerciseIds, attempts, expected }) => {
    expect(computeLessonScore(exerciseIds, attempts)).toEqual(expected);
  });

  it("never reports more answered exercises than the lesson contains", () => {
    // Guards the deduplication of `exerciseIds`: without it, a repeated id would
    // inflate `answeredExercises` past `totalExercises` and could report a
    // lesson complete while it is not.
    for (const { exerciseIds, attempts } of MATRIX) {
      const score = computeLessonScore(exerciseIds, attempts);

      expect(score.answeredExercises).toBeLessThanOrEqual(score.totalExercises);
      expect(score.correctExercises).toBeLessThanOrEqual(score.answeredExercises);
    }
  });

  it("reports completion only when every current exercise is answered", () => {
    for (const { exerciseIds, attempts, expected } of MATRIX) {
      const score = computeLessonScore(exerciseIds, attempts);

      expect(score.completed).toBe(
        score.totalExercises > 0 &&
          score.answeredExercises === score.totalExercises,
      );
      expect(score.completed).toBe(expected.completed);
    }
  });
});

describe("lessonProgressState", () => {
  const NOT_STARTED: LessonScore = {
    totalExercises: 3,
    answeredExercises: 0,
    correctExercises: 0,
    scorePercent: 0,
    completed: false,
  };

  it("is not_started with no attempts", () => {
    expect(lessonProgressState(NOT_STARTED, false)).toBe("not_started");
  });

  it("is not_started for a lesson that has no exercises at all", () => {
    const empty: LessonScore = {
      totalExercises: 0,
      answeredExercises: 0,
      correctExercises: 0,
      scorePercent: 0,
      completed: false,
    };

    expect(lessonProgressState(empty, false)).toBe("not_started");
  });

  it("is in_progress when some exercises are answered", () => {
    const partial: LessonScore = {
      totalExercises: 3,
      answeredExercises: 1,
      correctExercises: 1,
      scorePercent: 33,
      completed: false,
    };

    expect(lessonProgressState(partial, false)).toBe("in_progress");
  });

  it("is completed once every exercise is answered", () => {
    const finished: LessonScore = {
      totalExercises: 3,
      answeredExercises: 3,
      correctExercises: 1,
      scorePercent: 33,
      completed: true,
    };

    expect(lessonProgressState(finished, false)).toBe("completed");
  });

  it("is completed by a completion record alone, with no attempts", () => {
    expect(lessonProgressState(NOT_STARTED, true)).toBe("completed");
  });

  it("is never in_progress when a completion record exists", () => {
    const partial: LessonScore = {
      totalExercises: 3,
      answeredExercises: 2,
      correctExercises: 1,
      scorePercent: 33,
      completed: false,
    };

    expect(lessonProgressState(partial, true)).toBe("completed");
  });
});

describe("courseProgressPercent", () => {
  it.each([
    { label: "no lessons", total: 0, completed: 0, expected: 0 },
    { label: "half of them", total: 4, completed: 2, expected: 50 },
    { label: "all of them", total: 4, completed: 4, expected: 100 },
    { label: "one of three, rounded", total: 3, completed: 1, expected: 33 },
    { label: "none of them", total: 4, completed: 0, expected: 0 },
    { label: "a negative total", total: -1, completed: 0, expected: 0 },
  ])(
    "reports $expected% when $label",
    ({ total, completed, expected }) => {
      expect(courseProgressPercent(total, completed)).toBe(expected);
    },
  );

  it.each([
    { label: "more completions than lessons", completed: 99 },
    { label: "a negative completion count", completed: -1 },
  ])("clamps $label to the 0-100 range", ({ completed }) => {
    const percent = courseProgressPercent(4, completed);

    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  it("clamps an over-count to exactly 100 and an under-count to exactly 0", () => {
    expect(courseProgressPercent(4, 99)).toBe(100);
    expect(courseProgressPercent(4, -1)).toBe(0);
  });
});
