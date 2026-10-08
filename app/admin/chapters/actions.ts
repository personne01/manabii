"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { chapterSchema } from "@/schemas/admin/chapter.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createChapter(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = chapterSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.chapter.create({
      data: {
        courseId: data.courseId,
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        order: data.order,
        status: data.status as any,
      },
    });
  } catch (e) {
    console.error("[admin.chapter.create]", e);
    return { ok: false, formError: "Failed to create chapter" };
  }

  revalidatePath("/admin/chapters");
  redirect("/admin/chapters");
}

export async function updateChapter(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = chapterSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.chapter.update({
      where: { id },
      data: {
        courseId: data.courseId,
        slug: data.slug,
        title: data.title,
        description: data.description || "",
        order: data.order,
        status: data.status as any,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.chapter.update]", e);
    return { ok: false, formError: "Failed to update chapter" };
  }

  revalidatePath("/admin/chapters");
  revalidatePath(`/admin/chapters/${id}/edit`);
  redirect("/admin/chapters");
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.chapter.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.chapter.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete chapter. It has lessons (remove them first).",
    };
  }

  revalidatePath("/admin/chapters");
  redirect("/admin/chapters");
}
