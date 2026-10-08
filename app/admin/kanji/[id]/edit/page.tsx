import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { KanjiForm } from "@/components/admin/kanji-form";
import { updateKanji } from "../../actions";

export default async function EditKanjiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const kanji = await db.kanji.findUnique({ where: { id } });
  if (!kanji) notFound();

  const action = updateKanji.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Edit Kanji
        </h1>
        <p className="text-sm text-gray-600">Update kanji character</p>
      </div>
      <KanjiForm
        action={action}
        submitLabel="Update"
        defaultValues={{
          character: kanji.character,
          meanings: kanji.meaning.split(",").map((m) => m.trim()),
          onyomi: kanji.onyomi,
          kunyomi: kanji.kunyomi,
          strokeCount: kanji.strokeCount,
          jlpt: kanji.jlpt,
          tags: [],
        }}
      />
    </div>
  );
}
