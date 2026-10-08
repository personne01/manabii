import type { LessonProgressState } from "@/features/learning/progress";

/**
 * Shared badge for a lesson's derived progress state.
 *
 * A server component because `LessonProgressState` is already resolved server
 * side, so nothing here needs to ship to the browser. Label text is written out
 * rather than derived from the union member, because the enum member reads as an
 * internal identifier next to learner-facing copy.
 */
const LABELS: Record<LessonProgressState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const TONE: Record<LessonProgressState, string> = {
  not_started: "border-line bg-surface text-ink/60",
  in_progress: "border-brand/30 bg-brand/10 text-brand",
  completed: "border-success/30 bg-success/10 text-success",
};

export function ProgressBadge({ state }: { readonly state: LessonProgressState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TONE[state]}`}
    >
      {LABELS[state]}
    </span>
  );
}