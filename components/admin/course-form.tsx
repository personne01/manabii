"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { CourseFormValues } from "@/schemas/admin/course.schema";
import type { ActionResult } from "@/app/admin/courses/actions";

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

export function CourseForm({
  action,
  defaultValues,
  submitLabel = "Save",
}: {
  action: (state: ActionResult | null, formData: FormData) => Promise<ActionResult> | void;
  defaultValues?: Partial<CourseFormValues>;
  submitLabel?: string;
}) {
  return (
    <form action={action as any} className="space-y-6">
      <div className="grid gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-1">
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
        <div className="space-y-2 md:col-span-1">
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
          <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="level">
            Level
          </label>
          <select
            id="level"
            name="level"
            defaultValue={defaultValues?.level ?? "N5"}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20"
          >
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
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
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/courses"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
