import { redirect } from "next/navigation";

import { requireContentEditor } from "@/lib/auth.admin.server";
import { CourseForm } from "@/components/admin/course-form";
import { createCourse } from "../actions";

export default async function NewCoursePage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Course
        </h1>
        <p className="text-sm text-gray-600">Create a new course</p>
      </div>
      <CourseForm action={createCourse} submitLabel="Create" />
    </div>
  );
}
