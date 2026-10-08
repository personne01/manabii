"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { vocabularySchema } from "@/schemas/admin/vocabulary.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createVocabulary(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = vocabularySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.vocabulary.create({
      data: {
        term: data.term,
        reading: data.reading,
        meaning: data.meaning,
        partOfSpeech: data.partOfSpeech,
        jlpt: data.jlpt,
        exampleSentence: data.exampleSentence || null,
        exampleReading: data.exampleReading || null,
        exampleTranslation: data.exampleTranslation || null,
        tags: data.tags,
      },
    });
  } catch (e) {
    console.error("[admin.vocab.create]", e);
    return { ok: false, formError: "Failed to create vocabulary" };
  }

  revalidatePath("/admin/vocabulary");
  redirect("/admin/vocabulary");
}

export async function updateVocabulary(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = vocabularySchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.vocabulary.update({
      where: { id },
      data: {
        term: data.term,
        reading: data.reading,
        meaning: data.meaning,
        partOfSpeech: data.partOfSpeech,
        jlpt: data.jlpt,
        exampleSentence: data.exampleSentence || null,
        exampleReading: data.exampleReading || null,
        exampleTranslation: data.exampleTranslation || null,
        tags: data.tags,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.vocab.update]", e);
    return { ok: false, formError: "Failed to update vocabulary" };
  }

  revalidatePath("/admin/vocabulary");
  revalidatePath(`/admin/vocabulary/${id}/edit`);
  redirect("/admin/vocabulary");
}

export async function deleteVocabulary(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.vocabulary.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.vocab.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete vocabulary. It is used in one or more lessons (remove from lessons first).",
    };
  }

  revalidatePath("/admin/vocabulary");
  redirect("/admin/vocabulary");
}
