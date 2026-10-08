import { redirect } from "next/navigation";

import { requireContentEditor } from "@/lib/auth.admin.server";
import { VocabularyForm } from "@/components/admin/vocabulary-form";
import { createVocabulary } from "../actions";

export default async function NewVocabularyPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Vocabulary
        </h1>
        <p className="text-sm text-gray-600">Create a new vocabulary term</p>
      </div>
      <VocabularyForm action={createVocabulary} submitLabel="Create" />
    </div>
  );
}
