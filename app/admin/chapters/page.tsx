import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { deleteChapter } from "./actions";

export default async function ChaptersAdminPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const chapters = await db.chapter.findMany({
    include: { course: true },
    orderBy: [{ courseId: "asc" }, { order: "asc" }],
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Chapters
          </h1>
          <p className="text-sm text-gray-600">Manage chapters</p>
        </div>
        <Link
          href="/admin/chapters/new"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90"
        >
          Add Chapter
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[var(--color-canvas)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Title</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Slug</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Course</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Order</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {chapters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No chapters yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                chapters.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{c.title}</td>
                    <td className="px-4 py-2 text-gray-700">{c.slug}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {c.course?.title} ({c.course?.slug})
                    </td>
                    <td className="px-4 py-2 text-gray-700">{c.status}</td>
                    <td className="px-4 py-2 text-gray-700">{c.order}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/chapters/${c.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteChapter(c.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
