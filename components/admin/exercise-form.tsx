"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { ExerciseFormValues } from "@/schemas/admin/exercise.schema";
import type { ActionResult } from "@/app/admin/exercises/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function ExerciseForm({
  action,
  defaultValues,
  submitLabel = "Save",
  lessons = [],
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> | void;
  defaultValues?: Partial<ExerciseFormValues>;
  submitLabel?: string;
  lessons?: Array<{ id: string; title: string; slug: string; chapter: { title: string; slug: string; course: { title: string; slug: string } } }>;
}) {
  return (
    <form action={action as any} className="space-y-6">
      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="lessonId">
            Lesson
          </label>
          <select
            id="lessonId"
            name="lessonId"
            defaultValue={defaultValues?.lessonId ?? ""}
            required
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="" disabled>
              Select lesson
            </option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.chapter?.course?.title} / {l.chapter?.title} / {l.title} ({l.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="type">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={defaultValues?.type ?? "MULTIPLE_CHOICE"}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
            <option value="TRUE_FALSE">TRUE_FALSE</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="difficulty">
            Difficulty (1-5)
          </label>
          <input
            id="difficulty"
            name="difficulty"
            type="number"
            min={1}
            max={5}
            defaultValue={defaultValues?.difficulty ?? 1}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="prompt">
            Question
          </label>
          <textarea
            id="prompt"
            name="prompt"
            defaultValue={defaultValues?.prompt ?? ""}
            rows={3}
            required
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="explanation">
            Explanation
          </label>
          <textarea
            id="explanation"
            name="explanation"
            defaultValue={defaultValues?.explanation ?? ""}
            rows={2}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="order">
            Order
          </label>
          <input
            id="order"
            name="order"
            type="number"
            min={0}
            required
            defaultValue={defaultValues?.order ?? 0}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "DRAFT"}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/exercises"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
