import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { ExerciseForm } from "@/components/admin/exercise-form";
import { createExercise } from "../actions";

export default async function NewExercisePage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const lessons = await db.lesson.findMany({
    include: {
      chapter: {
        include: { course: true },
      },
    },
    orderBy: [
      { chapter: { course: { level: "asc" } } },
      { chapter: { course: { order: "asc" } } },
      { chapter: { order: "asc" } },
      { order: "asc" },
    ],
    take: 1000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Exercise
        </h1>
        <p className="text-sm text-gray-600">Create a new exercise</p>
      </div>
      <ExerciseForm action={createExercise} submitLabel="Create" lessons={lessons} />
    </div>
  );
}
