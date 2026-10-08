"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { kanjiSchema } from "@/schemas/admin/kanji.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createKanji(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = kanjiSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.kanji.create({
      data: {
        character: data.character,
        onyomi: data.onyomi,
        kunyomi: data.kunyomi,
        meaning: data.meanings.join(", "),
        strokeCount: data.strokeCount === "" || data.strokeCount === null ? null : Number(data.strokeCount),
        jlpt: data.jlpt,
      },
    });
  } catch (e) {
    console.error("[admin.kanji.create]", e);
    return { ok: false, formError: "Failed to create kanji" };
  }

  revalidatePath("/admin/kanji");
  redirect("/admin/kanji");
}

export async function updateKanji(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = kanjiSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.kanji.update({
      where: { id },
      data: {
        character: data.character,
        onyomi: data.onyomi || null,
        kunyomi: data.kunyomi || null,
        meaning: data.meanings.join(", "),
        strokeCount: data.strokeCount === "" || data.strokeCount === null ? null : Number(data.strokeCount),
        jlpt: data.jlpt,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.kanji.update]", e);
    return { ok: false, formError: "Failed to update kanji" };
  }

  revalidatePath("/admin/kanji");
  revalidatePath(`/admin/kanji/${id}/edit`);
  redirect("/admin/kanji");
}

export async function deleteKanji(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.kanji.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.kanji.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete kanji. It is used in one or more lessons (remove from lessons first).",
    };
  }

  revalidatePath("/admin/kanji");
  redirect("/admin/kanji");
}
