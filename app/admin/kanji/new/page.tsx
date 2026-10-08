import { redirect } from "next/navigation";

import { requireContentEditor } from "@/lib/auth.admin.server";
import { KanjiForm } from "@/components/admin/kanji-form";
import { createKanji } from "../actions";

export default async function NewKanjiPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Kanji
        </h1>
        <p className="text-sm text-gray-600">Create a new kanji character</p>
      </div>
      <KanjiForm action={createKanji} submitLabel="Create" />
    </div>
  );
}
