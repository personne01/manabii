import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { deleteVocabulary } from "./actions";

export default async function VocabularyAdminPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const vocabularies = await db.vocabulary.findMany({
    orderBy: [{ jlpt: "asc" }, { term: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Vocabulary (Kotoba)
          </h1>
          <p className="text-sm text-gray-600">Manage vocabulary for JLPT N5–N1</p>
        </div>
        <Link
          href="/admin/vocabulary/new"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90"
        >
          Add Vocabulary
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[var(--color-canvas)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Term</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Reading</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Meaning</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">PoS</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">JLPT</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {vocabularies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No vocabulary yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                vocabularies.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{v.term}</td>
                    <td className="px-4 py-2 text-gray-700">{v.reading}</td>
                    <td className="px-4 py-2 text-gray-700">{v.meaning}</td>
                    <td className="px-4 py-2 text-gray-700">{v.partOfSpeech}</td>
                    <td className="px-4 py-2 text-gray-700">{v.jlpt}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/vocabulary/${v.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteVocabulary(v.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
