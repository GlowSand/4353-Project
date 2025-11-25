import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/__tests__/**/*.test.{js,ts}"],
    watch: false,
    coverage: {
        provider: "v8",
        reporter: ["text","html","lcov"],
        all: true,
        include: ["server/**/*.js"],
        exclude: [
            "server/server.js",          // Vite glue
            "server/models.js",          // types only
            "server/demo_data/**",
            "server/store.memory.DEAD.js", // ignore dead store file
            "server/api/test.js",
        ],
        lines: 80, functions: 80, branches: 80, statements: 80
    }
  }
});
