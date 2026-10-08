import Link from "next/link";

export const metadata = {
  title: "Unauthorized — Manabii",
};

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          403 — Unauthorized
        </h1>
        <p className="max-w-md text-gray-600">
          You don&apos;t have permission to access this page. You need
          CONTENT_EDITOR or ADMIN role to access the Admin Dashboard.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-brand)] px-5 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--color-brand)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
      >
        Back to Home
      </Link>
    </main>
  );
}
