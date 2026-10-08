"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { lessonSchema } from "@/schemas/admin/lesson.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createLesson(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = lessonSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.lesson.create({
      data: {
        chapterId: data.chapterId,
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        order: data.order,
        status: data.status as any,
      },
    });
  } catch (e) {
    console.error("[admin.lesson.create]", e);
    return { ok: false, formError: "Failed to create lesson" };
  }

  revalidatePath("/admin/lessons");
  redirect("/admin/lessons");
}

export async function updateLesson(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = lessonSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.lesson.update({
      where: { id },
      data: {
        chapterId: data.chapterId,
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        order: data.order,
        status: data.status as any,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.lesson.update]", e);
    return { ok: false, formError: "Failed to update lesson" };
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${id}/edit`);
  redirect("/admin/lessons");
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.lesson.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.lesson.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete lesson. It has linked content or exercises.",
    };
  }

  revalidatePath("/admin/lessons");
  redirect("/admin/lessons");
}
