import type { ExerciseType } from "@/app/generated/prisma/client";

/**
 * An exercise option as the grader must see it, answer key included.
 *
 * Server-only. `isCorrect` must never reach a Client Component: use
 * `toPublicExercise` to build the shape that crosses that boundary.
 */
export interface GradableOption {
  readonly id: string;
  readonly label: string;
  readonly isCorrect: boolean;
}

/** The exercise fields grading depends on. Carries no lesson, course, or user data. */
export interface GradableExercise {
  readonly id: string;
  readonly type: ExerciseType;
  readonly explanation: string | null;
  readonly options: readonly GradableOption[];
}

export type RejectionReason =
  | "ungradeable_exercise"
  | "unknown_option";

export type GradedAnswer =
  | {
      readonly outcome: "graded";
      readonly isCorrect: boolean;
      readonly correctOptionId: string;
      readonly correctLabel: string;
      readonly explanation: string | null;
    }
  | {
      readonly outcome: "rejected";
      readonly reason: RejectionReason;
    };

/** Option shape a type can be graded against, checked before any answer is scored. */
function hasGradingShape(
  type: ExerciseType,
  options: readonly GradableOption[],
): boolean {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return options.length >= 2;
    case "TRUE_FALSE":
      return options.length === 2;
  }
}

/**
 * Grades one submitted option against an exercise's answer key.
 *
 * Fails closed: an ambiguous key, a malformed option set, or an option id that
 * does not belong to this exercise all reject rather than guess. Lookup is
 * scoped to `exercise.options`, so a client cannot submit an option id borrowed
 * from another exercise and have it scored against this one.
 */
export function gradeAnswer(
  exercise: GradableExercise,
  submittedOptionId: string,
): GradedAnswer {
  const correctOptions = exercise.options.filter((option) => option.isCorrect);
  const answerKey = correctOptions.at(0);

  if (
    correctOptions.length !== 1 ||
    answerKey === undefined ||
    !hasGradingShape(exercise.type, exercise.options)
  ) {
    return { outcome: "rejected", reason: "ungradeable_exercise" };
  }

  const submitted = exercise.options.find(
    (option) => option.id === submittedOptionId,
  );
  if (submitted === undefined) {
    return { outcome: "rejected", reason: "unknown_option" };
  }

  return {
    outcome: "graded",
    isCorrect: submitted.id === answerKey.id,
    correctOptionId: answerKey.id,
    correctLabel: answerKey.label,
    explanation: exercise.explanation,
  };
}

export interface PublicOption {
  readonly id: string;
  readonly label: string;
}

/** An exercise stripped to exactly what a Client Component may receive. */
export interface PublicExercise {
  readonly id: string;
  readonly type: ExerciseType;
  readonly prompt: string;
  readonly order: number;
  readonly options: readonly PublicOption[];
}

/**
 * Builds the client-safe exercise projection by selecting fields explicitly
 * rather than by omitting fields, so a future column on `Exercise` or
 * `ExerciseOption` cannot leak by accident.
 */
export function toPublicExercise(exercise: {
  readonly id: string;
  readonly type: ExerciseType;
  readonly prompt: string;
  readonly order: number;
  readonly options: readonly { readonly id: string; readonly label: string }[];
}): PublicExercise {
  return {
    id: exercise.id,
    type: exercise.type,
    prompt: exercise.prompt,
    order: exercise.order,
    options: exercise.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  };
}
