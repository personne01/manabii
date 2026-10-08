"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import type { ExerciseType } from "@/app/generated/prisma/client";
import { GoogleSignInButton } from "@/components/auth/sign-in-button";
import {
  submitAnswer,
  type SubmitAnswerFailureReason,
  type SubmitAnswerResult,
} from "@/features/learning/actions";
import type { PublicExercise } from "@/features/learning/answer-validation";

/**
 * One-question-at-a-time exercise flow.
 *
 * A Client Component because grading feedback arrives from `submitAnswer` and must
 * be reflected in the DOM immediately. Two boundaries are deliberate:
 *
 * 1. It receives `PublicExercise[]` — `toPublicExercise` has already dropped
 *    `isCorrect` and `explanation`, so the answer key was never sent rather than
 *    merely left unused here. It arrives only in the `SubmitAnswerResult` returned
 *    after a real submission.
 * 2. It never computes a score. The result screen re-reads the authoritative score
 *    from PostgreSQL, so a client cannot report a score it invented.
 */

const TYPE_LABELS: Record<ExerciseType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True or false",
};

/**
 * One refusal message per reason rather than a single generic failure, because
 * `unauthenticated` is the only reason the learner can act on.
 *
 * `unauthenticated` deliberately does not say whether an account exists: the
 * server collapses "no session" and "no such user" into one reason, and the copy
 * must not reintroduce the distinction the API refuses to make.
 */
const FAILURE_MESSAGES: Record<SubmitAnswerFailureReason, string> = {
  unauthenticated: "Sign in to record your answers.",
  forbidden: "You do not have access to this lesson.",
  invalid_input: "That answer could not be read. Please try again.",
  unknown_exercise: "This question is no longer available.",
  ungradeable_exercise: "This question cannot be graded right now.",
  unknown_option: "That answer is not one of the choices.",
  conflict: "Another tab recorded an answer. Reload to see the latest.",
  internal_error: "Something went wrong while saving your answer. Please try again.",
};

type GradedAnswer = Extract<SubmitAnswerResult, { readonly ok: true }>;

export function ExerciseRunner({
  exercises,
  lessonSlug,
  isAuthenticated,
}: {
  readonly exercises: readonly PublicExercise[];
  readonly lessonSlug: string;
  readonly isAuthenticated: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [chosenOptionId, setChosenOptionId] = useState<string | null>(null);
  const [graded, setGraded] = useState<GradedAnswer | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exercise = exercises[index];
  const isLastExercise = index === exercises.length - 1;
  const promptId = exercise === undefined ? "exercise-prompt" : `prompt-${exercise.id}`;

  function handleSubmit(): void {
    if (exercise === undefined || chosenOptionId === null) {
      return;
    }
    const submittedOptionId = chosenOptionId;
    setFailure(null);

    startTransition(async () => {
      const outcome = await submitAnswer({
        exerciseId: exercise.id,
        optionId: submittedOptionId,
      });

      if (!outcome.ok) {
        setFailure(FAILURE_MESSAGES[outcome.reason]);
        return;
      }

      setGraded(outcome);
    });
  }

  function handleNext(): void {
    setIndex((current) => current + 1);
    setChosenOptionId(null);
    setGraded(null);
    setFailure(null);
  }

  if (exercise === undefined) {
    return null;
  }

  return (
    <section
      aria-labelledby={promptId}
      className="rounded-xl border border-line bg-surface p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          Question {index + 1} of {exercises.length}
        </p>
        <p className="text-xs uppercase tracking-wide text-ink/50">
          {TYPE_LABELS[exercise.type]}
        </p>
      </div>

      <h3 id={promptId} className="mt-4 text-lg font-medium text-ink">
        {exercise.prompt}
      </h3>

      {isAuthenticated ? (
        <>
          {/*
            fieldset/legend, not a heading over a bare list: a radio group is one
            question to a screen reader, and the prompt has to be its accessible
            name.
          */}
          <fieldset className="mt-4 flex flex-col gap-2">
            <legend className="sr-only">{exercise.prompt}</legend>
            {exercise.options.map((option) => {
              const inputId = `${exercise.id}-option-${option.id}`;
              const isChosen = chosenOptionId === option.id;
              const isKey = graded?.correctOptionId === option.id;
              const isWrongPick = graded !== null && isChosen && !isKey;

              return (
                <label
                  key={option.id}
                  htmlFor={inputId}
                  className={[
                    "flex min-h-11 items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
                    isWrongPick
                      ? "border-brand bg-brand/5"
                      : isKey
                        ? "border-success bg-success/5"
                        : isChosen
                          ? "border-brand/50 bg-brand/5"
                          : "border-line bg-surface hover:border-brand/30",
                    graded === null ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`exercise-${exercise.id}`}
                    value={option.id}
                    checked={isChosen}
                    disabled={graded !== null || isPending}
                    onChange={() => setChosenOptionId(option.id)}
                    className="h-4 w-4 shrink-0 accent-brand"
                  />
                  <span className="text-ink">{option.label}</span>
                </label>
              );
            })}
          </fieldset>

          {/*
            polite rather than assertive: the verdict should be announced without
            yanking focus away from the control the learner just activated. The
            failure paragraph inside it is role="alert" on its own, so a refusal
            is still announced assertively.
          */}
          <div aria-live="polite" className="mt-4 min-h-6">
            {failure === null ? null : (
              <p role="alert" className="text-sm text-brand">
                {failure}
              </p>
            )}

            {graded === null ? null : (
              <div className="flex flex-col gap-2">
                <p
                  className={
                    graded.isCorrect ? "text-sm text-success" : "text-sm text-brand"
                  }
                >
                  {graded.isCorrect
                    ? "Correct."
                    : `Not quite. The correct answer is “${graded.correctLabel}”.`}
                </p>
                {graded.explanation === null ? null : (
                  <p className="text-sm text-ink/70">{graded.explanation}</p>
                )}
                {graded.lessonCompleted ? (
                  <p className="text-sm font-medium text-success">
                    Lesson complete.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-4">
            {graded === null ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={chosenOptionId === null || isPending}
                aria-busy={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Checking…" : "Check answer"}
              </button>
            ) : isLastExercise ? (
              <Link
                href={`/learn/${lessonSlug}/result`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                See your score
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 py-3 font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Next question
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-line bg-canvas px-4 py-4">
          <p className="text-sm text-ink/70">
            This is a preview. Sign in to answer questions and record your score.
          </p>
          <div className="mt-4 sm:max-w-xs">
            <GoogleSignInButton
              callbackUrl={`/learn/${lessonSlug}`}
              label="Sign in to answer"
            />
          </div>
        </div>
      )}
    </section>
  );
}