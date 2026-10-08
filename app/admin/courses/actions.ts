"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { courseSchema } from "@/schemas/admin/course.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createCourse(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = courseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.course.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        level: data.level,
        status: data.status as any,
        order: data.order,
      },
    });
  } catch (e) {
    console.error("[admin.course.create]", e);
    return { ok: false, formError: "Failed to create course" };
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function updateCourse(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = courseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.course.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        level: data.level,
        status: data.status as any,
        order: data.order,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.course.update]", e);
    return { ok: false, formError: "Failed to update course" };
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}/edit`);
  redirect("/admin/courses");
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.course.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.course.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete course. It has chapters/lessons (remove them first).",
    };
  }

  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
