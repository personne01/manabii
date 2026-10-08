import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { ChapterForm } from "@/components/admin/chapter-form";
import { createChapter } from "../actions";

export default async function NewChapterPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const courses = await db.course.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: [{ level: "asc" }, { order: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Chapter
        </h1>
        <p className="text-sm text-gray-600">Create a new chapter</p>
      </div>
      <ChapterForm action={createChapter} submitLabel="Create" courses={courses} />
    </div>
  );
}
