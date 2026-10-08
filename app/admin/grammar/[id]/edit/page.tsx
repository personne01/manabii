import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { GrammarForm } from "@/components/admin/grammar-form";
import { updateGrammar } from "../../actions";

export default async function EditGrammarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const grammar = await db.grammar.findUnique({ where: { id } });
  if (!grammar) notFound();

  const action = updateGrammar.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Grammar
        </h1>
        <p className="text-sm text-gray-600">Update Bunpou grammar pattern</p>
      </div>
      <GrammarForm
        action={action}
        submitLabel="Update"
        defaultValues={{
          pattern: grammar.pattern,
          reading: grammar.reading ?? "",
          meaning: grammar.meaning,
          formation: grammar.formation,
          explanation: grammar.explanation ?? "",
          register: grammar.register,
          exampleSentence: grammar.exampleSentence,
          exampleReading: grammar.exampleReading ?? "",
          exampleTranslation: grammar.exampleTranslation,
          relatedSlugs: grammar.relatedSlugs,
          jlpt: grammar.jlpt,
        }}
      />
    </div>
  );
}
