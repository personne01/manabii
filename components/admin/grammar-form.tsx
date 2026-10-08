"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { GrammarFormValues } from "@/schemas/admin/grammar.schema";
import type { ActionResult } from "@/app/admin/grammar/actions";

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

export function GrammarForm({
  action,
  defaultValues,
  submitLabel = "Save",
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> | void;
  defaultValues?: Partial<GrammarFormValues>;
  submitLabel?: string;
}) {
  return (
    <form action={action as any} className="space-y-6">
      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="pattern">
            Pattern
          </label>
          <input
            id="pattern"
            name="pattern"
            defaultValue={defaultValues?.pattern ?? ""}
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
            maxLength={120}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
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
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="formation">
            Formation
          </label>
          <input
            id="formation"
            name="formation"
            defaultValue={defaultValues?.formation ?? ""}
            required
            maxLength={255}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="register">
            Register
          </label>
          <input
            id="register"
            name="register"
            defaultValue={defaultValues?.register ?? ""}
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
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="explanation">
            Explanation
          </label>
          <textarea
            id="explanation"
            name="explanation"
            defaultValue={defaultValues?.explanation ?? ""}
            rows={4}
            maxLength={5000}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="exampleSentence">
            Example Sentence
          </label>
          <textarea
            id="exampleSentence"
            name="exampleSentence"
            defaultValue={defaultValues?.exampleSentence ?? ""}
            rows={3}
            required
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
            required
            maxLength={5000}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="relatedSlugs">
            Related Slugs (comma separated)
          </label>
          <input
            id="relatedSlugs"
            name="relatedSlugs"
            defaultValue={
              Array.isArray(defaultValues?.relatedSlugs)
                ? defaultValues.relatedSlugs.join(", ")
                : ""
            }
            maxLength={400}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/grammar"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
