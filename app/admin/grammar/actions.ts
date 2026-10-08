"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { grammarSchema } from "@/schemas/admin/grammar.schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

export async function createGrammar(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = grammarSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.grammar.create({
      data: {
        pattern: data.pattern,
        reading: data.reading || null,
        meaning: data.meaning,
        formation: data.formation,
        explanation: data.explanation || null,
        register: data.register,
        exampleSentence: data.exampleSentence,
        exampleReading: data.exampleReading || null,
        exampleTranslation: data.exampleTranslation,
        relatedSlugs: data.relatedSlugs,
        jlpt: data.jlpt,
      },
    });
  } catch (e) {
    console.error("[admin.grammar.create]", e);
    return { ok: false, formError: "Failed to create grammar" };
  }

  revalidatePath("/admin/grammar");
  redirect("/admin/grammar");
}

export async function updateGrammar(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireContentEditor();

  const raw = Object.fromEntries(formData.entries());
  const parsed = grammarSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: parsed.error.flatten().formErrors.join(", ") || undefined,
    };
  }

  const data = parsed.data;

  try {
    await db.grammar.update({
      where: { id },
      data: {
        pattern: data.pattern,
        reading: data.reading || null,
        meaning: data.meaning,
        formation: data.formation,
        explanation: data.explanation || null,
        register: data.register,
        exampleSentence: data.exampleSentence,
        exampleReading: data.exampleReading || null,
        exampleTranslation: data.exampleTranslation,
        relatedSlugs: data.relatedSlugs,
        jlpt: data.jlpt,
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin.grammar.update]", e);
    return { ok: false, formError: "Failed to update grammar" };
  }

  revalidatePath("/admin/grammar");
  revalidatePath(`/admin/grammar/${id}/edit`);
  redirect("/admin/grammar");
}

export async function deleteGrammar(id: string): Promise<ActionResult> {
  await requireContentEditor();

  try {
    await db.grammar.delete({ where: { id } });
  } catch (e) {
    console.error("[admin.grammar.delete]", e);
    return {
      ok: false,
      formError:
        "Cannot delete grammar. It is used in one or more lessons (remove from lessons first).",
    };
  }

  revalidatePath("/admin/grammar");
  redirect("/admin/grammar");
}
