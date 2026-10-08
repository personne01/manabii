"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { exerciseSchema } from "@/schemas/admin/exercise.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createExercise(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = exerciseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.exercise.create({
      data: {
        lessonId: data.lessonId,
        type: data.type,
        prompt: data.prompt,
        explanation: data.explanation,
        difficulty: data.difficulty,
        order: data.order,
        status: data.status as any,
      },
    });
  } catch (e) {
    console.error("[admin.exercise.create]", e);
    return { ok: false, formError: "Failed to create exercise" };
  }

  revalidatePath("/admin/exercises");
  redirect("/admin/exercises");
}

export async function updateExercise(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = exerciseSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.exercise.update({
      where: { id },
      data: {
        lessonId: data.lessonId,
        type: data.type,
        prompt: data.prompt,
        explanation: data.explanation,
        difficulty: data.difficulty,
        order: data.order,
        status: data.status as any,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.exercise.update]", e);
    return { ok: false, formError: "Failed to update exercise" };
  }

  revalidatePath("/admin/exercises");
  revalidatePath(`/admin/exercises/${id}/edit`);
  redirect("/admin/exercises");
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.exercise.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.exercise.delete]", e);
    return { ok: false, formError: "Failed to delete exercise" };
  }

  revalidatePath("/admin/exercises");
  redirect("/admin/exercises");
}
