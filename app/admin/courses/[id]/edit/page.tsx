import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { CourseForm } from "@/components/admin/course-form";
import { updateCourse } from "../../actions";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const course = await db.course.findUnique({ where: { id } });
  if (!course) notFound();

  const action = updateCourse.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Course
        </h1>
        <p className="text-sm text-gray-600">Update course</p>
      </div>
      <CourseForm
        action={action}
        submitLabel="Update"
        defaultValues={{
          slug: course.slug,
          title: course.title,
          description: course.description,
          level: course.level,
          status: course.status,
          order: course.order,
        }}
      />
    </div>
  );
}
