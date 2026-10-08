"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { ChapterFormValues } from "@/schemas/admin/chapter.schema";
import type { ActionResult } from "@/app/admin/chapters/actions";

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

export function ChapterForm({
  action,
  defaultValues,
  submitLabel = "Save",
  courses = [],
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> | void;
  defaultValues?: Partial<ChapterFormValues>;
  submitLabel?: string;
  courses?: Array<{ id: string; title: string; slug: string }>;
}) {
  return (
    <form action={action as any} className="space-y-6">
      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="courseId">
            Course
          </label>
          <select
            id="courseId"
            name="courseId"
            defaultValue={defaultValues?.courseId ?? ""}
            required
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="" disabled>
              Select course
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={defaultValues?.slug ?? ""}
            required
            maxLength={80}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={defaultValues?.title ?? ""}
            required
            maxLength={120}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            rows={3}
            maxLength={5000}
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
          href="/admin/chapters"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
