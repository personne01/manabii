import { describe, expect, it } from "vitest";

import type { ExerciseType } from "@/app/generated/prisma/client";
import {
  gradeAnswer,
  toPublicExercise,
  type GradableExercise,
  type GradableOption,
  type GradedAnswer,
  type RejectionReason,
} from "@/features/learning/answer-validation";

/**
 * Pure grading tests.
 *
 * `features/learning/answer-validation.ts` imports only the generated *type* of
 * `ExerciseType`, never a database client, so scoring is exhaustively testable
 * here with no PostgreSQL. Grading is the one place a learner's score is
 * decided, so the suite asserts the rejection paths as carefully as the happy
 * path: an ambiguous answer key or a borrowed option id must never resolve to a
 * score.
 */

type Graded = Extract<GradedAnswer, { outcome: "graded" }>;

const EXERCISE_ID = "0192f4a1-0000-7000-8000-000000000001";

function option(id: string, label: string, isCorrect: boolean): GradableOption {
  return { id, label, isCorrect };
}

function exercise(
  overrides: Partial<GradableExercise> = {},
): GradableExercise {
  return {
    id: EXERCISE_ID,
    type: "MULTIPLE_CHOICE",
    explanation: null,
    options: [
      option("0192f4a1-0000-7000-8000-00000000000a", " waters ", true),
      option("0192f4a1-0000-7000-8000-00000000000b", "friend", false),
      option("0192f4a1-0000-7000-8000-00000000000c", "teacher", false),
    ],
    ...overrides,
  };
}

const CORRECT_ID = "0192f4a1-0000-7000-8000-00000000000a";
const WRONG_ID = "0192f4a1-0000-7000-8000-00000000000b";

function expectGraded(result: GradedAnswer): Graded {
  if (result.outcome !== "graded") {
    throw new Error(`expected a graded answer, received ${result.outcome}`);
  }
  return result;
}

function expectRejected(result: GradedAnswer): RejectionReason {
  if (result.outcome !== "rejected") {
    throw new Error("expected the submission to be rejected");
  }
  return result.reason;
}

describe("gradeAnswer", () => {
  it("grades the correct option as correct", () => {
    const result = expectGraded(gradeAnswer(exercise(), CORRECT_ID));

    expect(result.isCorrect).toBe(true);
    expect(result.correctOptionId).toBe(CORRECT_ID);
    expect(result.correctLabel).toBe(" waters ");
  });

  it("grades a wrong option as incorrect but still reveals the answer key", () => {
    const result = expectGraded(gradeAnswer(exercise(), WRONG_ID));

    expect(result.isCorrect).toBe(false);
    expect(result.correctOptionId).toBe(CORRECT_ID);
    expect(result.correctLabel).toBe(" waters ");
  });

  it("passes the explanation through, and tolerates its absence", () => {
    const withExplanation = expectGraded(
      gradeAnswer(exercise({ explanation: "mizu is water." }), CORRECT_ID),
    );
    const withoutExplanation = expectGraded(gradeAnswer(exercise(), CORRECT_ID));

    expect(withExplanation.explanation).toBe("mizu is water.");
    expect(withoutExplanation.explanation).toBeNull();
  });

  it("grades TRUE_FALSE exercises", () => {
    const trueFalse = exercise({
      type: "TRUE_FALSE",
      options: [
        option("0192f4a1-0000-7000-8000-00000000000a", "True", true),
        option("0192f4a1-0000-7000-8000-00000000000b", "False", false),
      ],
    });

    expect(expectGraded(gradeAnswer(trueFalse, CORRECT_ID)).isCorrect).toBe(true);
    expect(expectGraded(gradeAnswer(trueFalse, WRONG_ID)).isCorrect).toBe(false);
  });

  it("rejects an option id that belongs to a different exercise", () => {
    // The containment check scopes lookup to this exercise's options, so an id
    // borrowed from elsewhere can never be scored against this answer key.
    const otherExerciseOption = "0192f4a1-0000-7000-8000-00000000dead";

    expect(expectRejected(gradeAnswer(exercise(), otherExerciseOption))).toBe(
      "unknown_option",
    );
  });

  const UNGRADEABLE: readonly {
    readonly label: string;
    readonly candidate: GradableExercise;
  }[] = [
    {
      label: "no correct option",
      candidate: exercise({
        options: [
          option("0192f4a1-0000-7000-8000-00000000000a", "a", false),
          option("0192f4a1-0000-7000-8000-00000000000b", "b", false),
        ],
      }),
    },
    {
      label: "two correct options",
      candidate: exercise({
        options: [
          option("0192f4a1-0000-7000-8000-00000000000a", "a", true),
          option("0192f4a1-0000-7000-8000-00000000000b", "b", true),
        ],
      }),
    },
    {
      label: "no options at all",
      candidate: exercise({ options: [] }),
    },
    {
      label: "MULTIPLE_CHOICE with a single option",
      candidate: exercise({
        options: [option("0192f4a1-0000-7000-8000-00000000000a", "only", true)],
      }),
    },
    {
      label: "TRUE_FALSE with three options",
      candidate: exercise({
        type: "TRUE_FALSE",
        options: [
          option("0192f4a1-0000-7000-8000-00000000000a", "True", true),
          option("0192f4a1-0000-7000-8000-00000000000b", "False", false),
          option("0192f4a1-0000-7000-8000-00000000000c", "Maybe", false),
        ],
      }),
    },
  ];

  it.each(UNGRADEABLE)("refuses to grade an exercise with $label", ({ candidate }) => {
    expect(expectRejected(gradeAnswer(candidate, CORRECT_ID))).toBe(
      "ungradeable_exercise",
    );
  });

  it("covers every exercise type with at least one gradeable and one ungradeable case", () => {
    const gradeableTypes: ExerciseType[] = ["MULTIPLE_CHOICE", "TRUE_FALSE"];
    const rejectedTypes = new Set(
      UNGRADEABLE.map(({ candidate }) => candidate.type),
    );

    expect([...rejectedTypes].sort()).toEqual([...gradeableTypes].sort());
  });
});

describe("toPublicExercise", () => {
  it("keeps only the fields a client component may receive", () => {
    const projected = toPublicExercise({
      id: EXERCISE_ID,
      type: "MULTIPLE_CHOICE",
      prompt: "mizu wa nan desu ka?",
      order: 1,
      options: [
        { id: CORRECT_ID, label: " waters " },
        { id: WRONG_ID, label: "friend" },
      ],
    });

    expect(projected).toEqual({
      id: EXERCISE_ID,
      type: "MULTIPLE_CHOICE",
      prompt: "mizu wa nan desu ka?",
      order: 1,
      options: [
        { id: CORRECT_ID, label: " waters " },
        { id: WRONG_ID, label: "friend" },
      ],
    });
  });

  it("selects fields explicitly, so a wider source row cannot leak extra columns", () => {
    // Typed as a wider row and passed as a variable, which is how a database
    // result actually reaches this boundary: excess-property checking only
    // applies to fresh literals. The projection must still narrow it, so a
    // future `Exercise` or `ExerciseOption` column cannot leak by accident.
    const sourceRow: {
      id: string;
      type: ExerciseType;
      prompt: string;
      order: number;
      answerKey: string;
      options: { id: string; label: string; isCorrect: boolean }[];
    } = {
      id: EXERCISE_ID,
      type: "TRUE_FALSE",
      prompt: "Is mizu water?",
      order: 0,
      answerKey: CORRECT_ID,
      options: [
        { id: CORRECT_ID, label: "True", isCorrect: true },
        { id: WRONG_ID, label: "False", isCorrect: false },
      ],
    };

    const projected = toPublicExercise(sourceRow);

    expect(projected).toEqual({
      id: EXERCISE_ID,
      type: "TRUE_FALSE",
      prompt: "Is mizu water?",
      order: 0,
      options: [
        { id: CORRECT_ID, label: "True" },
        { id: WRONG_ID, label: "False" },
      ],
    });
    expect(Object.keys(projected)).not.toContain("answerKey");
    for (const projectedOption of projected.options) {
      expect(Object.keys(projectedOption)).not.toContain("isCorrect");
    }
  });
});
