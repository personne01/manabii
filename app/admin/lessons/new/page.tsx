import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { LessonForm } from "@/components/admin/lesson-form";
import { createLesson } from "../actions";

export default async function NewLessonPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const chapters = await db.chapter.findMany({
    include: { course: true },
    orderBy: [{ course: { level: "asc" } }, { course: { order: "asc" } }, { order: "asc" }],
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Lesson
        </h1>
        <p className="text-sm text-gray-600">Create a new lesson</p>
      </div>
      <LessonForm action={createLesson} submitLabel="Create" chapters={chapters} />
    </div>
  );
}
