import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { ExerciseForm } from "@/components/admin/exercise-form";
import { updateExercise } from "../../actions";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const [exercise, lessons] = await Promise.all([
    db.exercise.findUnique({ where: { id } }),
    db.lesson.findMany({
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
    }),
  ]);

  if (!exercise) notFound();

  const action = updateExercise.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Exercise
        </h1>
        <p className="text-sm text-gray-600">Update exercise</p>
      </div>
      <ExerciseForm
        action={action}
        submitLabel="Update"
        lessons={lessons}
        defaultValues={{
          lessonId: exercise.lessonId,
          type: exercise.type,
          prompt: exercise.prompt,
          explanation: exercise.explanation,
          difficulty: exercise.difficulty,
          order: exercise.order,
          status: exercise.status,
        }}
      />
    </div>
  );
}
