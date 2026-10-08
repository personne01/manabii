import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { deleteExercise } from "./actions";

export default async function ExercisesAdminPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const exercises = await db.exercise.findMany({
    include: { lesson: { include: { chapter: { include: { course: true } } } } },
    orderBy: [
      { lesson: { chapter: { courseId: "asc" } } },
      { lesson: { chapter: { order: "asc" } } },
      { lesson: { order: "asc" } },
      { order: "asc" },
    ],
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Exercises
          </h1>
          <p className="text-sm text-gray-600">Manage exercises</p>
        </div>
        <Link
          href="/admin/exercises/new"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90"
        >
          Add Exercise
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-[var(--color-canvas)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Question</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Type</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Difficulty</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Course/Chapter/Lesson</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Order</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {exercises.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No exercises yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                exercises.map((e) => (
                  <tr key={e.id}>
                    <td className="max-w-md truncate px-4 py-2 text-[var(--color-ink)]">{e.prompt}</td>
                    <td className="px-4 py-2 text-gray-700">{e.type}</td>
                    <td className="px-4 py-2 text-gray-700">{e.difficulty}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {e.lesson?.chapter?.course?.title} / {e.lesson?.chapter?.title} / {e.lesson?.title}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{e.status}</td>
                    <td className="px-4 py-2 text-gray-700">{e.order}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/exercises/${e.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteExercise(e.id);
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
