"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { VocabularyFormValues } from "@/schemas/admin/vocabulary.schema";
import type { ActionResult } from "@/app/admin/vocabulary/actions";

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

export function VocabularyForm({
  action,
  defaultValues,
  submitLabel = "Save",
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> | void;
  defaultValues?: Partial<VocabularyFormValues>;
  submitLabel?: string;
}) {
  return (
    <form action={action as any} className="space-y-6">
      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="term">
            Term
          </label>
          <input
            id="term"
            name="term"
            defaultValue={defaultValues?.term ?? ""}
            required
            maxLength={120}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="reading">
            Reading
          </label>
          <input
            id="reading"
            name="reading"
            defaultValue={defaultValues?.reading ?? ""}
            required
            maxLength={120}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="meaning">
            Meaning
          </label>
          <input
            id="meaning"
            name="meaning"
            defaultValue={defaultValues?.meaning ?? ""}
            required
            maxLength={255}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="partOfSpeech">
            Part of Speech
          </label>
          <input
            id="partOfSpeech"
            name="partOfSpeech"
            defaultValue={defaultValues?.partOfSpeech ?? ""}
            required
            maxLength={60}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="jlpt">
            JLPT
          </label>
          <select
            id="jlpt"
            name="jlpt"
            defaultValue={defaultValues?.jlpt ?? "N5"}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="tags">
            Tags (comma separated)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={
              Array.isArray(defaultValues?.tags)
                ? defaultValues.tags.join(", ")
                : ""
            }
            maxLength={200}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="exampleSentence">
            Example Sentence
          </label>
          <textarea
            id="exampleSentence"
            name="exampleSentence"
            defaultValue={defaultValues?.exampleSentence ?? ""}
            rows={3}
            maxLength={5000}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="exampleReading">
            Example Reading
          </label>
          <input
            id="exampleReading"
            name="exampleReading"
            defaultValue={defaultValues?.exampleReading ?? ""}
            maxLength={400}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="exampleTranslation">
            Example Translation
          </label>
          <input
            id="exampleTranslation"
            name="exampleTranslation"
            defaultValue={defaultValues?.exampleTranslation ?? ""}
            maxLength={5000}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/vocabulary"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
