import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    /**
     * Vitest resolves modules outside Next.js, so the `@/` alias declared in
     * `tsconfig.json` has to be restated here. Node does not honor tsconfig
     * paths on its own, so without this every `@/lib/...` import would fail.
     */
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    /**
     * Every suite under `test/integration` shares the single database named by
     * `TEST_DATABASE_URL`, and two of them assert on rows they did not create:
     * `authorization.test.ts` requires the admin user listing to equal exactly
     * its own three fixtures. With file-level parallelism, one suite's fixtures
     * are visible to another mid-run and that assertion fails for reasons that
     * have nothing to do with the code under test. Serializing files keeps each
     * suite's `afterAll` teardown complete before the next suite seeds, so no
     * assertion has to be weakened to tolerate a concurrent neighbour.
     */
    fileParallelism: false,
  },
});