/**
 * Route-level pending state for `/learn`.
 *
 * `aria-busy` plus a visually hidden status message means a screen-reader user is
 * told the page is loading rather than being left on a skeleton with no
 * announcement. The skeleton mirrors the dashboard's real shape so the layout
 * does not jump when content arrives.
 *
 * The pulse is disabled under `prefers-reduced-motion` per `AGENTS.md` section 5:
 * the skeleton still reads as a placeholder when it stops animating, so honouring
 * the preference costs nothing.
 */
export default function LearnLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-4xl flex-1 px-6 py-12"
    >
      <p role="status" className="sr-only">
        Loading your course…
      </p>

      <div className="motion-reduce:animate-none animate-pulse border-b border-line pb-8">
        <div className="h-3 w-16 rounded bg-line" />
        <div className="mt-3 h-9 w-64 rounded bg-line" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-line" />
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {[0, 1].map((chapter) => (
          <section key={chapter}>
            <div className="h-6 w-40 rounded bg-line" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((lesson) => (
                <div key={lesson} className="h-28 rounded-xl border border-line bg-surface" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}