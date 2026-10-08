import { redirect } from "next/navigation";

import { requireContentEditor } from "@/lib/auth.admin.server";
import { GrammarForm } from "@/components/admin/grammar-form";
import { createGrammar } from "../actions";

export default async function NewGrammarPage() {
  const user = await requireContentEditor();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          Add Grammar
        </h1>
        <p className="text-sm text-gray-600">Create a new Bunpou grammar pattern</p>
      </div>
      <GrammarForm action={createGrammar} submitLabel="Create" />
    </div>
  );
}
