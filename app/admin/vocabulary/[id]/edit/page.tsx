import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { VocabularyForm } from "@/components/admin/vocabulary-form";
import { updateVocabulary } from "../../actions";

export default async function EditVocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const vocab = await db.vocabulary.findUnique({ where: { id } });
  if (!vocab) notFound();

  const action = updateVocabulary.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Vocabulary
        </h1>
        <p className="text-sm text-gray-600">Update vocabulary term</p>
      </div>
      <VocabularyForm
        action={action}
        submitLabel="Update"
        defaultValues={{
          term: vocab.term,
          reading: vocab.reading,
          meaning: vocab.meaning,
          partOfSpeech: vocab.partOfSpeech,
          jlpt: vocab.jlpt,
          exampleSentence: vocab.exampleSentence ?? "",
          exampleReading: vocab.exampleReading ?? "",
          exampleTranslation: vocab.exampleTranslation ?? "",
          tags: vocab.tags,
        }}
      />
    </div>
  );
}
