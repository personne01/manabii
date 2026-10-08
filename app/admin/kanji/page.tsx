import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { deleteKanji } from "./actions";

export default async function KanjiAdminPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const kanjis = await db.kanji.findMany({
    orderBy: [{ jlpt: "asc" }, { character: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Kanji
          </h1>
          <p className="text-sm text-gray-600">Manage kanji characters</p>
        </div>
        <Link
          href="/admin/kanji/new"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90"
        >
          Add Kanji
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[var(--color-canvas)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Character</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Meaning</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Onyomi</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Kunyomi</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Strokes</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">JLPT</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {kanjis.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No kanji yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                kanjis.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-2 text-[var(--color-ink)] font-semibold">{k.character}</td>
                    <td className="px-4 py-2 text-gray-700">{k.meaning}</td>
                    <td className="px-4 py-2 text-gray-700">{k.onyomi.join(", ")}</td>
                    <td className="px-4 py-2 text-gray-700">{k.kunyomi.join(", ")}</td>
                    <td className="px-4 py-2 text-gray-700">{k.strokeCount ?? "-"}</td>
                    <td className="px-4 py-2 text-gray-700">{k.jlpt}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/kanji/${k.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteKanji(k.id);
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
