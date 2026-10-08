import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { ChapterForm } from "@/components/admin/chapter-form";
import { updateChapter } from "../../actions";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const [chapter, courses] = await Promise.all([
    db.chapter.findUnique({ where: { id } }),
    db.course.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: [{ level: "asc" }, { order: "asc" }],
      take: 200,
    }),
  ]);

  if (!chapter) notFound();

  const action = updateChapter.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Chapter
        </h1>
        <p className="text-sm text-gray-600">Update chapter</p>
      </div>
      <ChapterForm
        action={action}
        submitLabel="Update"
        courses={courses}
        defaultValues={{
          courseId: chapter.courseId,
          slug: chapter.slug,
          title: chapter.title,
          description: chapter.description,
          status: chapter.status,
          order: chapter.order,
        }}
      />
    </div>
  );
}
