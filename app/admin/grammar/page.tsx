import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireContentEditor } from "@/lib/auth.admin.server";
import { deleteGrammar } from "./actions";

export default async function GrammarAdminPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  const grammars = await db.grammar.findMany({
    orderBy: [{ jlpt: "asc" }, { pattern: "asc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Grammar (Bunpou)
          </h1>
          <p className="text-sm text-gray-600">Manage grammar patterns for JLPT N5–N1</p>
        </div>
        <Link
          href="/admin/grammar/new"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90"
        >
          Add Grammar
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[var(--color-canvas)]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Pattern</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Meaning</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Register</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">JLPT</th>
                <th className="px-4 py-2 text-left font-medium text-[var(--color-ink)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {grammars.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No grammar patterns yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                grammars.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{g.pattern}</td>
                    <td className="px-4 py-2 text-gray-700">{g.meaning}</td>
                    <td className="px-4 py-2 text-gray-700">{g.register}</td>
                    <td className="px-4 py-2 text-gray-700">{g.jlpt}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/grammar/${g.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-canvas)]"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteGrammar(g.id);
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
