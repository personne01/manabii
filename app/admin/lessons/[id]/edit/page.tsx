import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { LessonForm } from "@/components/admin/lesson-form";
import { updateLesson } from "../../actions";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const [lesson, chapters] = await Promise.all([
    db.lesson.findUnique({ where: { id } }),
    db.chapter.findMany({
      include: { course: true },
      orderBy: [{ course: { level: "asc" } }, { course: { order: "asc" } }, { order: "asc" }],
      take: 500,
    }),
  ]);

  if (!lesson) notFound();

  const action = updateLesson.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Lesson
        </h1>
        <p className="text-sm text-gray-600">Update lesson</p>
      </div>
      <LessonForm
        action={action}
        submitLabel="Update"
        chapters={chapters}
        defaultValues={{
          chapterId: lesson.chapterId,
          slug: lesson.slug,
          title: lesson.title,
          description: lesson.description,
          status: lesson.status,
          order: lesson.order,
        }}
      />
    </div>
  );
}
